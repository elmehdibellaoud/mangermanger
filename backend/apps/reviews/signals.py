from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Review
from .tasks import analyze_review_sentiment


@receiver(post_save, sender=Review)
def enqueue_sentiment_analysis(sender, instance: Review, created, **kwargs):
    """Dispatch async sentiment analysis on new reviews (or if comment changed)."""
    if not created and instance.sentiment is not None:
        return  # already analyzed and not a new review
    if not instance.comment:
        return
    analyze_review_sentiment.delay(instance.id)
