from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel
from apps.menu.models import Dish


class TableStatus(models.TextChoices):
    FREE = "FREE", "Libre"
    OCCUPIED = "OCCUPIED", "Occupée"
    RESERVED = "RESERVED", "Réservée"


class OrderStatus(models.TextChoices):
    DRAFT = "DRAFT", "Brouillon"
    SENT = "SENT", "Envoyée"
    PREPARING = "PREPARING", "En préparation"
    READY = "READY", "Prête"
    SERVED = "SERVED", "Servie"
    PAID = "PAID", "Payée"
    CANCELLED = "CANCELLED", "Annulée"


class OrderItemStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    PREPARING = "PREPARING", "En préparation"
    READY = "READY", "Prêt"
    SERVED = "SERVED", "Servi"


class Table(TimeStampedModel):
    number = models.PositiveIntegerField(unique=True)
    capacity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    status = models.CharField(
        max_length=10, choices=TableStatus.choices, default=TableStatus.FREE
    )

    class Meta:
        ordering = ["number"]

    def __str__(self) -> str:
        return f"Table {self.number} ({self.capacity}p)"


class Order(TimeStampedModel):
    table = models.ForeignKey(
        Table, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_as_client",
    )
    server = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_as_server",
    )
    status = models.CharField(
        max_length=12, choices=OrderStatus.choices, default=OrderStatus.DRAFT
    )
    total = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )
    discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]

    def __str__(self) -> str:
        return f"Order #{self.pk} — {self.get_status_display()}"

    def recompute_total(self) -> Decimal:
        total = sum(
            (item.unit_price * item.quantity for item in self.items.all()),
            Decimal("0.00"),
        )
        self.total = max(Decimal("0.00"), total - self.discount)
        return self.total


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    dish = models.ForeignKey(Dish, on_delete=models.PROTECT, related_name="+")
    quantity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )
    notes = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=10, choices=OrderItemStatus.choices, default=OrderItemStatus.PENDING
    )

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.quantity}× {self.dish.name}"

    def save(self, *args, **kwargs):
        if not self.unit_price:
            self.unit_price = self.dish.price
        super().save(*args, **kwargs)
