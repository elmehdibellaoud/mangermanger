from django.conf import settings
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils.timezone import now, timedelta
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsGerant

from .models import Review, Sentiment
from .sentiment import analyze_text
from .serializers import ReviewSerializer
from .tasks import analyze_review_sentiment


class AdminReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsGerant]
    http_method_names = ["get", "patch", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = Review.objects.select_related("client", "dish").all()
        sentiment = self.request.query_params.get("sentiment")
        if sentiment:
            qs = qs.filter(sentiment=sentiment)
        approved = self.request.query_params.get("is_approved")
        if approved is not None:
            qs = qs.filter(is_approved=approved in ("true", "1"))
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.save(update_fields=["is_approved"])
        return Response(self.get_serializer(review).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        review = self.get_object()
        review.is_approved = False
        review.save(update_fields=["is_approved"])
        return Response(self.get_serializer(review).data)

    @action(detail=True, methods=["post"])
    def reanalyze(self, request, pk=None):
        review = self.get_object()
        analyze_review_sentiment.delay(review.id)
        return Response({"status": "queued"}, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=["get"], url_path="sentiment-stats")
    def sentiment_stats(self, request):
        qs = Review.objects.exclude(sentiment__isnull=True)
        totals = qs.aggregate(
            positive=Count("id", filter=Q(sentiment=Sentiment.POSITIVE)),
            neutral=Count("id", filter=Q(sentiment=Sentiment.NEUTRAL)),
            negative=Count("id", filter=Q(sentiment=Sentiment.NEGATIVE)),
        )

        by_dish = list(
            qs.values("dish__id", "dish__name")
            .annotate(
                positive=Count("id", filter=Q(sentiment=Sentiment.POSITIVE)),
                negative=Count("id", filter=Q(sentiment=Sentiment.NEGATIVE)),
                total=Count("id"),
            )
            .order_by("-total")[:10]
        )

        since = now() - timedelta(days=30)
        by_day = list(
            qs.filter(created_at__gte=since)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                positive=Count("id", filter=Q(sentiment=Sentiment.POSITIVE)),
                negative=Count("id", filter=Q(sentiment=Sentiment.NEGATIVE)),
                total=Count("id"),
            )
            .order_by("day")
        )

        return Response({
            "totals": totals,
            "by_dish": by_dish,
            "by_day_30d": by_day,
        })


class SentimentPredictSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000)


class SentimentPredictView(APIView):
    """Standalone sentiment playground — text in, sentiment + score out."""

    permission_classes = [IsGerant]

    def post(self, request):
        ser = SentimentPredictSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        result = analyze_text(ser.validated_data["text"])
        return Response({
            "sentiment": result.sentiment,
            "score": result.score,
            "backend": "huggingface"
            if getattr(settings, "SENTIMENT_MODEL_ENABLED", False)
            else "keyword",
        })
