from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.common.models import TimeStampedModel
from apps.menu.models import Dish


class Sentiment(models.TextChoices):
    POSITIVE = "POSITIVE", "Positif"
    NEUTRAL = "NEUTRAL", "Neutre"
    NEGATIVE = "NEGATIVE", "Négatif"


class Review(TimeStampedModel):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="reviews",
    )
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    comment = models.TextField(blank=True)
    is_approved = models.BooleanField(default=True)

    # Sentiment analysis (filled asynchronously — Phase 5.A).
    # NULL = not yet analyzed; distinct from NEUTRAL (analyzed, no polarity).
    sentiment = models.CharField(  # noqa: DJ001
        max_length=10, choices=Sentiment.choices, null=True, blank=True
    )
    sentiment_score = models.FloatField(null=True, blank=True)
    analyzed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["dish", "is_approved"]),
            models.Index(fields=["sentiment"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__isnull=True) | (models.Q(rating__gte=1) & models.Q(rating__lte=5)),
                name="review_rating_range",
            ),
        ]

    def __str__(self) -> str:
        who = self.client.email if self.client_id else "anonyme"
        return f"{who} → {self.dish.name}: {self.rating}/5"
