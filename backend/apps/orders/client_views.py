from rest_framework import generics, permissions

from .models import Order
from .serializers import OrderSerializer


class ClientOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(client=self.request.user)
            .select_related("table", "server")
            .prefetch_related("items__dish")
            .order_by("-created_at")
        )
