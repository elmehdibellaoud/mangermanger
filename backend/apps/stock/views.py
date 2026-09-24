from rest_framework import viewsets

from apps.common.permissions import IsGerant

from .models import StockItem, StockMovement
from .serializers import StockItemSerializer, StockMovementSerializer


class StockItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockItem.objects.select_related("ingredient").all()
    serializer_class = StockItemSerializer
    permission_classes = [IsGerant]
    pagination_class = None


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related("ingredient", "created_by").all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsGerant]
    http_method_names = ["get", "post", "head", "options"]
