from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response

from apps.orders.models import OrderItem

from .models import Review


class ClientReviewSerializer(serializers.ModelSerializer):
    dish_name = serializers.CharField(source="dish.name", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id", "dish", "dish_name", "rating", "comment",
            "sentiment", "created_at",
        ]
        read_only_fields = ["sentiment", "created_at"]


class ClientReviewListCreateView(generics.ListCreateAPIView):
    """Client can list their own reviews + create (on dishes they've ordered)."""

    serializer_class = ClientReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Review.objects.filter(client=self.request.user)
            .select_related("dish")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        dish_id = request.data.get("dish")
        has_ordered = OrderItem.objects.filter(
            order__client=request.user, dish_id=dish_id
        ).exists()
        if not has_ordered:
            return Response(
                {"detail": "Vous ne pouvez laisser d'avis que sur un plat que vous avez commandé."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(client=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
