from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.menu.models import Dish
from apps.reservations.models import ReservationStatus

from .models import (
    Order,
    OrderItem,
    OrderItemStatus,
    OrderStatus,
    Table,
    TableStatus,
)


class TableSerializer(serializers.ModelSerializer):
    active_order_id = serializers.SerializerMethodField()
    today_reservation = serializers.SerializerMethodField()

    class Meta:
        model = Table
        fields = ["id", "number", "capacity", "status", "active_order_id", "today_reservation"]

    def get_active_order_id(self, obj):
        active = obj.orders.exclude(
            status__in=[OrderStatus.PAID, OrderStatus.CANCELLED]
        ).order_by("-created_at").first()
        return active.id if active else None

    def get_today_reservation(self, obj):
        today = timezone.localdate()
        resa = (
            obj.reservations.filter(
                date=today,
                status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.SEATED],
            )
            .select_related("client")
            .order_by("time")
            .first()
        )
        if not resa:
            return None
        name = resa.guest_name or (
            f"{resa.client.first_name} {resa.client.last_name}".strip() or resa.client.email
            if resa.client_id else "invité"
        )
        return {
            "id": resa.id,
            "client_id": resa.client_id,
            "name": name,
            "time": resa.time.strftime("%H:%M"),
            "guests": resa.guests,
            "status": resa.status,
        }


class OrderItemSerializer(serializers.ModelSerializer):
    dish_name = serializers.CharField(source="dish.name", read_only=True)
    dish_prep_time = serializers.IntegerField(source="dish.prep_time", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id", "dish", "dish_name", "dish_prep_time",
            "quantity", "unit_price", "notes", "status",
        ]
        read_only_fields = ["unit_price", "status"]


class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["dish", "quantity", "notes"]

    def validate_dish(self, value: Dish):
        if not value.is_available:
            raise serializers.ValidationError("Ce plat n'est pas disponible.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    table_number = serializers.IntegerField(source="table.number", read_only=True)
    server_email = serializers.CharField(source="server.email", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "table", "table_number", "client", "server", "server_email",
            "status", "status_display", "total", "discount", "notes",
            "items", "created_at", "updated_at",
        ]
        read_only_fields = ["total", "server", "status", "created_at", "updated_at"]


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "table", "client", "notes", "status", "total"]
        read_only_fields = ["id", "status", "total"]
        extra_kwargs = {"client": {"required": False, "allow_null": True}}

    def validate_table(self, value: Table):
        has_active = value.orders.exclude(
            status__in=[OrderStatus.PAID, OrderStatus.CANCELLED]
        ).exists()
        if has_active:
            raise serializers.ValidationError("Une commande active existe déjà sur cette table.")
        return value


def recompute_and_save_order(order: Order):
    """Recompute order total from items (bypassing any prefetch cache)."""
    total = sum(
        (item.unit_price * item.quantity for item in OrderItem.objects.filter(order=order)),
        Decimal("0.00"),
    )
    order.total = max(Decimal("0.00"), total - order.discount)
    order.save(update_fields=["total", "updated_at"])


def promote_order_if_all_items_ready(order: Order):
    """If every item is READY, lift the order status."""
    items = list(order.items.all())
    if items and all(i.status == OrderItemStatus.READY for i in items):
        if order.status != OrderStatus.READY:
            order.status = OrderStatus.READY
            order.save(update_fields=["status", "updated_at"])


def mark_table_status(table: Table, status: str):
    if table.status != status:
        table.status = status
        table.save(update_fields=["status", "updated_at"])


def release_table_if_no_active_order(table: Table):
    has_active = table.orders.exclude(
        status__in=[OrderStatus.PAID, OrderStatus.CANCELLED]
    ).exists()
    if not has_active:
        mark_table_status(table, TableStatus.FREE)
