from django.db import transaction
from rest_framework import status as http
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import IsKitchenStaff, IsServeurOrGerant

from .models import (
    Order,
    OrderItem,
    OrderItemStatus,
    OrderStatus,
    Table,
    TableStatus,
)
from .serializers import (
    OrderCreateSerializer,
    OrderItemCreateSerializer,
    OrderItemSerializer,
    OrderSerializer,
    TableSerializer,
    mark_table_status,
    promote_order_if_all_items_ready,
    recompute_and_save_order,
    release_table_if_no_active_order,
)

# ============================== SERVEUR ==============================


class TableViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Table.objects.prefetch_related("orders").all()
    serializer_class = TableSerializer
    permission_classes = [IsServeurOrGerant]
    pagination_class = None


class StaffOrderViewSet(viewsets.ModelViewSet):
    """Serveur-facing order viewset: create, add items, send, pay."""

    permission_classes = [IsServeurOrGerant]

    def get_queryset(self):
        qs = (
            Order.objects
            .select_related("table", "server")
            .prefetch_related("items__dish")
            .order_by("-created_at")
        )
        mine = self.request.query_params.get("mine")
        if mine == "1":
            qs = qs.filter(server=self.request.user)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        order = serializer.save(server=self.request.user)
        if order.table_id:
            mark_table_status(order.table, TableStatus.OCCUPIED)

    @action(detail=True, methods=["patch"])
    def attach_client(self, request, pk=None):
        """Link an order to a client — typically matching the table's reservation."""
        order = self.get_object()
        client_id = request.data.get("client")
        if client_id is not None:
            from apps.accounts.models import Role, User
            try:
                user = User.objects.get(pk=client_id, role=Role.CLIENT)
            except User.DoesNotExist:
                return Response({"detail": "Client introuvable."}, status=http.HTTP_404_NOT_FOUND)
            order.client = user
        else:
            order.client = None
        order.save(update_fields=["client", "updated_at"])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["post"], serializer_class=OrderItemCreateSerializer)
    def items(self, request, pk=None):
        order = self.get_object()
        if order.status not in {OrderStatus.DRAFT, OrderStatus.SENT, OrderStatus.PREPARING}:
            return Response(
                {"detail": "Impossible d'ajouter des plats à cette commande."},
                status=http.HTTP_400_BAD_REQUEST,
            )
        ser = OrderItemCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dish = ser.validated_data["dish"]
        item = OrderItem.objects.create(
            order=order,
            dish=dish,
            quantity=ser.validated_data["quantity"],
            notes=ser.validated_data.get("notes", ""),
            unit_price=dish.price,
        )
        recompute_and_save_order(order)
        return Response(OrderItemSerializer(item).data, status=http.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"items/(?P<item_id>\d+)")
    def remove_item(self, request, pk=None, item_id=None):
        order = self.get_object()
        try:
            item = order.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response(status=http.HTTP_404_NOT_FOUND)
        item.delete()
        recompute_and_save_order(order)
        return Response(status=http.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def send(self, request, pk=None):
        order = self.get_object()
        if order.status != OrderStatus.DRAFT:
            return Response(
                {"detail": "Seule une commande en brouillon peut être envoyée."},
                status=http.HTTP_400_BAD_REQUEST,
            )
        if not order.items.exists():
            return Response(
                {"detail": "Ajoutez au moins un plat avant d'envoyer."},
                status=http.HTTP_400_BAD_REQUEST,
            )
        order.status = OrderStatus.SENT
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def serve(self, request, pk=None):
        """Mark a READY order as SERVED (delivered to the table)."""
        order = self.get_object()
        if order.status != OrderStatus.READY:
            return Response(
                {"detail": "Commande non prête."},
                status=http.HTTP_400_BAD_REQUEST,
            )
        order.status = OrderStatus.SERVED
        order.items.update(status=OrderItemStatus.SERVED)
        order.save(update_fields=["status", "updated_at"])
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=["patch"])
    @transaction.atomic
    def pay(self, request, pk=None):
        order = self.get_object()
        if order.status not in {OrderStatus.SERVED, OrderStatus.READY}:
            return Response(
                {"detail": "Commande non payable dans cet état."},
                status=http.HTTP_400_BAD_REQUEST,
            )
        order.status = OrderStatus.PAID
        order.save(update_fields=["status", "updated_at"])
        
        # Deduct stock and award loyalty points
        from apps.stock.services import deduct_stock_for_order
        from apps.promotions.services import award_loyalty_points_for_order
        deduct_stock_for_order(order)
        award_loyalty_points_for_order(order)
        
        if order.table_id:
            release_table_if_no_active_order(order.table)
        return Response(OrderSerializer(order).data)


# ============================== CUISINIER (KDS) ==============================


class KdsOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """Active tickets for the kitchen display."""

    serializer_class = OrderSerializer
    permission_classes = [IsKitchenStaff]
    pagination_class = None

    def get_queryset(self):
        return (
            Order.objects
            .filter(status__in=[OrderStatus.SENT, OrderStatus.PREPARING])
            .select_related("table", "server")
            .prefetch_related("items__dish")
            .order_by("created_at")
        )


class KdsItemViewSet(viewsets.GenericViewSet):
    """Kitchen actions on individual items."""

    permission_classes = [IsKitchenStaff]
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer

    def _transition(self, request, pk, target: str, order_status: str | None = None):
        item = self.get_object()
        item.status = target
        item.save(update_fields=["status", "updated_at"])
        order = item.order
        if order_status and order.status != order_status:
            order.status = order_status
            order.save(update_fields=["status", "updated_at"])
        promote_order_if_all_items_ready(order)
        return Response(OrderItemSerializer(item).data)

    @action(detail=True, methods=["patch"])
    def start(self, request, pk=None):
        return self._transition(request, pk, OrderItemStatus.PREPARING, OrderStatus.PREPARING)

    @action(detail=True, methods=["patch"])
    def ready(self, request, pk=None):
        return self._transition(request, pk, OrderItemStatus.READY)
