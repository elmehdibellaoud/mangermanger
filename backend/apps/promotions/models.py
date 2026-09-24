from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel


class PromoType(models.TextChoices):
    PERCENT = "PERCENT", "Pourcentage"
    FIXED = "FIXED", "Montant fixe"


class PromoCode(TimeStampedModel):
    code = models.CharField(max_length=32, unique=True)
    type = models.CharField(max_length=8, choices=PromoType.choices)
    value = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )
    min_order = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.code} ({self.get_type_display()} {self.value})"

    def is_valid(self) -> bool:
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False
        return True

    def compute_discount(self, order_total: Decimal) -> Decimal:
        if order_total < self.min_order:
            return Decimal("0.00")
        if self.type == PromoType.PERCENT:
            return (order_total * self.value / Decimal("100")).quantize(Decimal("0.01"))
        return min(self.value, order_total)


class LoyaltyAccount(TimeStampedModel):
    client = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="loyalty"
    )
    points = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )

    def __str__(self) -> str:
        return f"Loyalty<{self.client.email}>: {self.points} pts"
