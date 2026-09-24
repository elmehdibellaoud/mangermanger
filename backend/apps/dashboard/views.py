from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsGerant
from apps.menu.models import Dish
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.reviews.models import Review


class DashboardStatsView(APIView):
    permission_classes = [IsGerant]

    def get(self, request):
        now = timezone.now()
        since_7d = now - timedelta(days=7)
        since_30d = now - timedelta(days=30)
        since_year = now - timedelta(days=365)

        paid = Order.objects.filter(status=OrderStatus.PAID)

        def revenue(since):
            return paid.filter(created_at__gte=since).aggregate(
                total=Sum("total")
            )["total"] or Decimal("0.00")

        revenue_by_day = list(
            paid.filter(created_at__gte=since_30d)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Sum("total"))
            .order_by("day")
        )

        top_dishes = list(
            OrderItem.objects.filter(order__status=OrderStatus.PAID)
            .values("dish__id", "dish__name")
            .annotate(sold=Sum("quantity"))
            .order_by("-sold")[:5]
        )

        return Response({
            "revenue": {
                "last_7d": revenue(since_7d),
                "last_30d": revenue(since_30d),
                "last_year": revenue(since_year),
            },
            "orders": {
                "total": Order.objects.count(),
                "paid": paid.count(),
                "in_progress": Order.objects.filter(
                    status__in=[OrderStatus.SENT, OrderStatus.PREPARING, OrderStatus.READY]
                ).count(),
            },
            "revenue_by_day": revenue_by_day,
            "top_dishes": [
                {"id": d["dish__id"], "name": d["dish__name"], "sold": d["sold"]}
                for d in top_dishes
            ],
            "counts": {
                "dishes": Dish.objects.count(),
                "dishes_available": Dish.objects.filter(is_available=True).count(),
                "reviews": Review.objects.count(),
            },
        })


class DashboardReviewsView(APIView):
    permission_classes = [IsGerant]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 10)), 50)
        qs = Review.objects.select_related("client", "dish").order_by("-created_at")[:limit]
        data = [
            {
                "id": r.id,
                "dish": r.dish.name,
                "client": r.client.email if r.client_id else "anonyme",
                "rating": r.rating,
                "comment": r.comment,
                "sentiment": r.sentiment,
                "sentiment_score": r.sentiment_score,
                "created_at": r.created_at,
            }
            for r in qs
        ]
        return Response({"results": data, "count": Review.objects.count()})
