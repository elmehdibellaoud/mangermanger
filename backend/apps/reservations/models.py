from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel
from apps.orders.models import Table


class ReservationStatus(models.TextChoices):
    PENDING = "PENDING", "En attente"
    CONFIRMED = "CONFIRMED", "Confirmée"
    CANCELLED = "CANCELLED", "Annulée"
    SEATED = "SEATED", "Installée"
    EXPIRED = "EXPIRED", "Expirée"


class Reservation(TimeStampedModel):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )
    guest_name = models.CharField(max_length=120, blank=True)
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=32, blank=True)
    date = models.DateField()
    time = models.TimeField()
    guests = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    table = models.ForeignKey(
        Table,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservations",
    )
    status = models.CharField(
        max_length=12,
        choices=ReservationStatus.choices,
        default=ReservationStatus.PENDING,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-date", "-time"]
        indexes = [models.Index(fields=["date", "status"])]

    def __str__(self) -> str:
        who = self.client.email if self.client_id else (self.guest_name or "invité")
        return f"Réservation {who} — {self.date} {self.time:%H:%M} ({self.guests}p)"
