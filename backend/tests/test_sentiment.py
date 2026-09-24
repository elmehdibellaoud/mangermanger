"""Phase 5.A — Sentiment analysis tests (keyword backend)."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish
from apps.reviews.models import Review
from apps.reviews.sentiment import analyze_text, reset_analyzer_for_tests

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_sentiment_cache():
    from django.core.cache import cache
    cache.clear()
    reset_analyzer_for_tests()
    yield


class TestKeywordAnalyzer:
    def test_positive_french(self):
        r = analyze_text("J'ai adoré ce plat, vraiment délicieux et savoureux !")
        assert r.sentiment == "POSITIVE"
        assert r.score >= 0.8

    def test_negative_french(self):
        r = analyze_text("Service catastrophique, plat froid et dégoûtant.")
        assert r.sentiment == "NEGATIVE"
        assert r.score >= 0.8

    def test_positive_english(self):
        r = analyze_text("I loved it — amazing and delicious!")
        assert r.sentiment == "POSITIVE"

    def test_neutral_empty(self):
        r = analyze_text("")
        assert r.sentiment == "NEUTRAL"

    def test_mixed_returns_sane_result(self):
        r = analyze_text("Le plat était bon mais le service catastrophique.")
        assert r.sentiment in {"POSITIVE", "NEGATIVE", "NEUTRAL"}


class TestSignalIntegration:
    def test_review_creation_triggers_sentiment(self):
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="X", category=cat, price=Decimal("50"))
        client = User.objects.create_user(email="c@example.com", password="pw", role=Role.CLIENT)
        review = Review.objects.create(
            client=client, dish=dish, rating=5, comment="J'ai adoré, excellent !"
        )
        review.refresh_from_db()
        assert review.sentiment == "POSITIVE"
        assert review.sentiment_score is not None
        assert review.analyzed_at is not None


class TestPlaygroundEndpoint:
    def test_predict_endpoint_returns_sentiment(self):
        gerant = User.objects.create_user(
            email="g@example.com", password="pw", role=Role.GERANT
        )
        api = APIClient()
        api.force_authenticate(gerant)
        r = api.post(
            "/api/admin/sentiment/predict/",
            {"text": "Excellent service, vraiment parfait !"},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["sentiment"] == "POSITIVE"
        assert r.data["backend"] == "keyword"

    def test_predict_requires_gerant(self):
        client = User.objects.create_user(email="c@example.com", password="pw", role=Role.CLIENT)
        api = APIClient()
        api.force_authenticate(client)
        r = api.post("/api/admin/sentiment/predict/", {"text": "Bien"}, format="json")
        assert r.status_code == 403


class TestReanalyzeAction:
    def test_reanalyze_queues_and_updates(self):
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="X", category=cat, price=Decimal("50"))
        client = User.objects.create_user(email="c@example.com", password="pw", role=Role.CLIENT)
        gerant = User.objects.create_user(email="g@example.com", password="pw", role=Role.GERANT)
        review = Review.objects.create(client=client, dish=dish, rating=3, comment="médiocre")
        # Wipe to prove reanalyze runs it again
        review.sentiment = None
        review.save(update_fields=["sentiment"])

        api = APIClient()
        api.force_authenticate(gerant)
        r = api.post(f"/api/admin/reviews/{review.id}/reanalyze/")
        assert r.status_code == 202
        review.refresh_from_db()
        assert review.sentiment is not None


class TestSentimentStats:
    def test_aggregates_counts(self):
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="X", category=cat, price=Decimal("50"))
        client = User.objects.create_user(email="c@example.com", password="pw", role=Role.CLIENT)
        Review.objects.create(client=client, dish=dish, rating=5, comment="délicieux")
        Review.objects.create(client=client, dish=dish, rating=1, comment="catastrophique")

        gerant = User.objects.create_user(email="g@example.com", password="pw", role=Role.GERANT)
        api = APIClient()
        api.force_authenticate(gerant)
        r = api.get("/api/admin/reviews/sentiment-stats/")
        assert r.status_code == 200
        totals = r.data["totals"]
        assert totals["positive"] >= 1
        assert totals["negative"] >= 1
