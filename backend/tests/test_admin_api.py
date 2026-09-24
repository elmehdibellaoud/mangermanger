"""Phase 2 tests: admin API permissions + dashboard correctness."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish
from apps.orders.models import Order, OrderItem, OrderStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def gerant():
    return User.objects.create_user(
        email="g@x.y", password="pw12345!", role=Role.GERANT
    )


@pytest.fixture
def serveur():
    return User.objects.create_user(
        email="s@x.y", password="pw12345!", role=Role.SERVEUR
    )


@pytest.fixture
def client_user():
    return User.objects.create_user(
        email="c@x.y", password="pw12345!", role=Role.CLIENT
    )


class TestPermissions:
    def test_unauthenticated_blocked(self, api):
        r = api.get("/api/admin/dishes/")
        assert r.status_code == 401

    def test_serveur_forbidden_from_admin(self, api, serveur):
        api.force_authenticate(serveur)
        assert api.get("/api/admin/dishes/").status_code == 403
        assert api.get("/api/admin/stock/").status_code == 403
        assert api.get("/api/admin/dashboard/stats/").status_code == 403
        assert api.get("/api/admin/employees/").status_code == 403

    def test_client_forbidden_from_admin(self, api, client_user):
        api.force_authenticate(client_user)
        assert api.get("/api/admin/dishes/").status_code == 403

    def test_gerant_allowed(self, api, gerant):
        api.force_authenticate(gerant)
        assert api.get("/api/admin/dishes/").status_code == 200
        assert api.get("/api/admin/dashboard/stats/").status_code == 200


class TestMenuCRUD:
    def test_gerant_creates_dish(self, api, gerant):
        api.force_authenticate(gerant)
        cat = Category.objects.create(name="Plats")
        payload = {
            "name": "Pizza Margherita",
            "description": "Tomate, mozza, basilic",
            "price": "72.00",
            "category": cat.id,
            "prep_time": 15,
        }
        r = api.post("/api/admin/dishes/", payload, format="json")
        assert r.status_code == 201, r.data
        assert Dish.objects.count() == 1

    def test_list_dishes_includes_category_name(self, api, gerant):
        api.force_authenticate(gerant)
        cat = Category.objects.create(name="Desserts")
        Dish.objects.create(name="Tarte", category=cat, price=Decimal("40"))
        r = api.get("/api/admin/dishes/")
        assert r.status_code == 200
        assert r.data["results"][0]["category_name"] == "Desserts"


class TestDashboardStats:
    def test_revenue_aggregates_paid_orders_only(self, api, gerant):
        api.force_authenticate(gerant)
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="X", category=cat, price=Decimal("100"))
        # 1 paid order of 200, 1 draft of 500 (should be excluded)
        paid = Order.objects.create(status=OrderStatus.PAID, total=Decimal("200.00"))
        OrderItem.objects.create(order=paid, dish=dish, quantity=2, unit_price=Decimal("100"))
        draft = Order.objects.create(status=OrderStatus.DRAFT, total=Decimal("500.00"))
        OrderItem.objects.create(order=draft, dish=dish, quantity=5, unit_price=Decimal("100"))

        r = api.get("/api/admin/dashboard/stats/")
        assert r.status_code == 200
        assert Decimal(r.data["revenue"]["last_7d"]) == Decimal("200.00")
        assert r.data["orders"]["paid"] == 1
        assert r.data["orders"]["total"] == 2

    def test_top_dishes_sorted_by_quantity(self, api, gerant):
        api.force_authenticate(gerant)
        cat = Category.objects.create(name="Plats")
        d1 = Dish.objects.create(name="Popular", category=cat, price=Decimal("50"))
        d2 = Dish.objects.create(name="Meh", category=cat, price=Decimal("50"))
        order = Order.objects.create(status=OrderStatus.PAID, total=Decimal("100"))
        OrderItem.objects.create(order=order, dish=d1, quantity=10, unit_price=Decimal("50"))
        OrderItem.objects.create(order=order, dish=d2, quantity=2, unit_price=Decimal("50"))
        r = api.get("/api/admin/dashboard/stats/")
        top = r.data["top_dishes"]
        assert top[0]["name"] == "Popular"
        assert top[0]["sold"] == 10


class TestStockMovements:
    def test_in_movement_increases_stock(self, api, gerant):
        from apps.menu.models import Ingredient, Unit
        from apps.stock.models import StockItem
        api.force_authenticate(gerant)
        ing = Ingredient.objects.create(name="Farine", unit=Unit.KG, cost_per_unit=Decimal("10"))
        StockItem.objects.create(ingredient=ing, quantity=Decimal("5"), threshold_low=Decimal("2"))
        r = api.post(
            "/api/admin/stock-movements/",
            {"ingredient": ing.id, "type": "IN", "quantity": "10", "reason": "Livraison"},
            format="json",
        )
        assert r.status_code == 201, r.data
        stock = StockItem.objects.get(ingredient=ing)
        assert stock.quantity == Decimal("15.000")

    def test_out_movement_decreases_and_flags_low(self, api, gerant):
        from apps.menu.models import Ingredient, Unit
        from apps.stock.models import StockItem
        api.force_authenticate(gerant)
        ing = Ingredient.objects.create(name="Tomate", unit=Unit.KG, cost_per_unit=Decimal("5"))
        StockItem.objects.create(ingredient=ing, quantity=Decimal("3"), threshold_low=Decimal("2"))
        api.post(
            "/api/admin/stock-movements/",
            {"ingredient": ing.id, "type": "OUT", "quantity": "2"},
            format="json",
        )
        stock = StockItem.objects.get(ingredient=ing)
        assert stock.quantity == Decimal("1.000")
        assert stock.is_low is True


class TestReviewModeration:
    def test_approve_toggles_flag(self, api, gerant, client_user):
        from apps.menu.models import Category, Dish
        from apps.reviews.models import Review
        api.force_authenticate(gerant)
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="X", category=cat, price=Decimal("10"))
        r = Review.objects.create(client=client_user, dish=dish, rating=4, is_approved=False)
        resp = api.post(f"/api/admin/reviews/{r.id}/approve/")
        assert resp.status_code == 200
        r.refresh_from_db()
        assert r.is_approved is True


class TestEmployeeScope:
    def test_employee_list_excludes_clients(self, api, gerant, client_user, serveur):
        api.force_authenticate(gerant)
        r = api.get("/api/admin/employees/")
        emails = {u["email"] for u in r.data["results"]}
        assert serveur.email in emails
        assert client_user.email not in emails
