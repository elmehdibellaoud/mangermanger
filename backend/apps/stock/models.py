from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel
from apps.menu.models import Ingredient


class MovementType(models.TextChoices):
    IN = "IN", "Entrée"
    OUT = "OUT", "Sortie"
    ADJUST = "ADJUST", "Ajustement"


class StockItem(TimeStampedModel):
    ingredient = models.OneToOneField(
        Ingredient, on_delete=models.CASCADE, related_name="stock"
    )
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)]
    )
    threshold_low = models.DecimalField(
        max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)]
    )

    class Meta:
        ordering = ["ingredient__name"]

    @property
    def is_low(self) -> bool:
        return self.quantity <= self.threshold_low

    def __str__(self) -> str:
        return f"Stock<{self.ingredient.name}>: {self.quantity}"


class StockMovement(TimeStampedModel):
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.PROTECT, related_name="movements"
    )
    type = models.CharField(max_length=8, choices=MovementType.choices)
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, validators=[MinValueValidator(0)]
    )
    reason = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.get_type_display()} {self.quantity} × {self.ingredient.name}"
