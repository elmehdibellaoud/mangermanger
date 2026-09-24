"""Celery tasks for review sentiment."""
from celery import shared_task
from django.utils import timezone

from .models import Review
from .sentiment import analyze_text


@shared_task(name="reviews.analyze_review_sentiment", rate_limit="60/m")
def analyze_review_sentiment(review_id: int) -> dict | None:
    try:
        review = Review.objects.get(pk=review_id)
    except Review.DoesNotExist:
        return None
    result = analyze_text(review.comment or "")
    review.sentiment = result.sentiment
    review.sentiment_score = result.score
    
    if result.sentiment == "POSITIVE":
        review.rating = 5 if result.score > 0.8 else 4
    elif result.sentiment == "NEGATIVE":
        review.rating = 1 if result.score > 0.8 else 2
    else:
        review.rating = 3

    review.analyzed_at = timezone.now()
    review.save(update_fields=["sentiment", "sentiment_score", "rating", "analyzed_at"])
    return {"id": review.id, "sentiment": result.sentiment, "score": result.score, "rating": review.rating}
