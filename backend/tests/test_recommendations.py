"""Phase 5.B — Recommendation engine tests."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish, DishIngredient, Ingredient, Unit
from apps.orders.models import Order, OrderItem, OrderStatus
from apps.recommendations.engine import RecommendationEngine
from apps.reviews.models import Review, Sentiment

pytestmark = pytest.mark.django_db


@pytest.fixture
def menu():
    italian = Category.objects.create(name="Italien", slug="italien")
    moroccan = Category.objects.create(name="Marocain", slug="marocain")

    def make(name, cat, *, price="50", ingredients=()):
        d = Dish.objects.create(name=name, category=cat, price=Decimal(price))
        for ing in ingredients:
            DishIngredient.objects.create(dish=d, ingredient=ing, quantity=Decimal("0.1"))
        return d

    tomato = Ingredient.objects.create(name="Tomate", unit=Unit.KG, cost_per_unit=Decimal("5"))
    mozza = Ingredient.objects.create(name="Mozzarella", unit=Unit.KG, cost_per_unit=Decimal("80"))
    basil = Ingredient.objects.create(name="Basilic", unit=Unit.UNIT, cost_per_unit=Decimal("3"))
    chicken = Ingredient.objects.create(name="Poulet", unit=Unit.KG, cost_per_unit=Decimal("50"))
    saffron = Ingredient.objects.create(name="Safran", unit=Unit.UNIT, cost_per_unit=Decimal("20"))

    return {
        "pizza": make("Pizza Margherita", italian, ingredients=[tomato, mozza, basil]),
        "pasta": make("Pâtes tomate", italian, ingredients=[tomato, basil]),
        "lasagna": make("Lasagnes", italian, ingredients=[tomato, mozza, basil]),
        "tajine": make("Tajine poulet", moroccan, ingredients=[chicken, saffron]),
        "couscous": make("Couscous royal", moroccan, ingredients=[chicken, saffron]),
    }


class TestContentBased:
    def test_similar_dishes_share_high_overlap(self, menu):
        engine = RecommendationEngine()
        similar = engine.similar_dishes(menu["pizza"].id, k=3)
        names = [s.dish.name for s in similar]
        # Pizza and Lasagnes share category + tomato + mozza + basil
        assert "Lasagnes" in names
        assert "Pâtes tomate" in names

    def test_different_cuisine_ranks_lower(self, menu):
        engine = RecommendationEngine()
        similar = engine.similar_dishes(menu["pizza"].id, k=5)
        top_name = similar[0].dish.name
        assert top_name in {"Lasagnes", "Pâtes tomate"}


class TestColdStart:
    def test_new_user_gets_popular_fallback(self, menu):
        new_user = User.objects.create_user(email="new@example.com", password="pw", role=Role.CLIENT)
        # Give one dish a high rating + positive sentiment
        Review.objects.create(
            client=new_user, dish=menu["tajine"], rating=5, comment="délicieux",
            sentiment=Sentiment.POSITIVE, sentiment_score=0.9, is_approved=True,
        )
        # Fresh user with no history
        fresh = User.objects.create_user(email="fresh@example.com", password="pw", role=Role.CLIENT)
        engine = RecommendationEngine()
        results = engine.recommend_for_user(fresh, k=3)
        assert len(results) > 0
        # tajine should rank near the top (rating + positive sentiment)
        assert results[0].dish.name == "Tajine poulet"


class TestCollaborative:
    def test_similar_tastes_yield_related_suggestions(self, menu):
        italians_lover = User.objects.create_user(email="a@example.com", password="pw", role=Role.CLIENT)
        twin = User.objects.create_user(email="b@example.com", password="pw", role=Role.CLIENT)
        # Both users love pizza + pasta (twin also had lasagna)
        for user in [italians_lover, twin]:
            order = Order.objects.create(client=user, status=OrderStatus.PAID)
            OrderItem.objects.create(order=order, dish=menu["pizza"], quantity=1, unit_price=Decimal("80"))
            OrderItem.objects.create(order=order, dish=menu["pasta"], quantity=1, unit_price=Decimal("60"))
        twin_order = Order.objects.create(client=twin, status=OrderStatus.PAID)
        OrderItem.objects.create(order=twin_order, dish=menu["lasagna"], quantity=1, unit_price=Decimal("90"))

        engine = RecommendationEngine()
        recs = engine.recommend_for_user(italians_lover, k=3)
        names = [r.dish.name for r in recs]
        assert "Lasagnes" in names  # twin's pick surfaces to the similar user


class TestSimilarDishesEndpoint:
    def test_public_endpoint_returns_similar(self, menu):
        api = APIClient()
        r = api.get(f"/api/public/dishes/{menu['pizza'].id}/similar/")
        assert r.status_code == 200
        names = {x["name"] for x in r.data["results"]}
        assert "Lasagnes" in names or "Pâtes tomate" in names

    def test_unknown_dish_is_404(self):
        api = APIClient()
        r = api.get("/api/public/dishes/99999/similar/")
        assert r.status_code == 404


class TestRecommendationsEndpoint:
    def test_client_gets_recommendations(self, menu):
        user = User.objects.create_user(email="u@example.com", password="pw", role=Role.CLIENT)
        api = APIClient()
        api.force_authenticate(user)
        r = api.get("/api/client/recommendations/")
        assert r.status_code == 200
        assert "results" in r.data

    def test_non_client_blocked(self, menu):
        gerant = User.objects.create_user(email="g@example.com", password="pw", role=Role.GERANT)
        api = APIClient()
        api.force_authenticate(gerant)
        r = api.get("/api/client/recommendations/")
        assert r.status_code == 403
