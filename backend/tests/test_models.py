from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish, Ingredient, Unit
from apps.orders.models import Order, OrderItem, OrderStatus, Table
from apps.promotions.models import PromoCode, PromoType
from apps.reservations.models import Reservation
from apps.reviews.models import Review

pytestmark = pytest.mark.django_db


class TestUser:
    def test_email_is_unique(self):
        User.objects.create_user(email="a@x.y", password="pw")
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                User.objects.create_user(email="a@x.y", password="pw")

    def test_email_required(self):
        with pytest.raises(ValueError):
            User.objects.create_user(email="", password="pw")

    def test_default_role_is_client(self):
        u = User.objects.create_user(email="b@x.y", password="pw")
        assert u.role == Role.CLIENT

    def test_is_staff_role(self):
        u = User.objects.create_user(email="s@x.y", password="pw", role=Role.SERVEUR)
        assert u.is_staff_role is True


class TestMenu:
    def test_dish_price_must_be_positive(self, db):
        cat = Category.objects.create(name="Plats")
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Dish.objects.create(name="Bad", category=cat, price=Decimal("0.00"))

    def test_category_slug_autofilled(self):
        cat = Category.objects.create(name="Entrées Chaudes")
        assert cat.slug == "entrees-chaudes"

    def test_ingredient_unit_choices(self):
        ing = Ingredient.objects.create(name="Sel", unit=Unit.KG, cost_per_unit=Decimal("3"))
        assert ing.unit == "kg"


class TestOrder:
    def test_order_recompute_total(self):
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="Pizza", category=cat, price=Decimal("80.00"))
        order = Order.objects.create(status=OrderStatus.DRAFT)
        OrderItem.objects.create(order=order, dish=dish, quantity=2, unit_price=Decimal("80.00"))
        OrderItem.objects.create(order=order, dish=dish, quantity=1, unit_price=Decimal("80.00"))
        order.recompute_total()
        assert order.total == Decimal("240.00")

    def test_order_item_unit_price_defaults_to_dish_price(self):
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="Dish", category=cat, price=Decimal("50.00"))
        order = Order.objects.create()
        item = OrderItem(order=order, dish=dish, quantity=1)
        item.save()
        assert item.unit_price == Decimal("50.00")


class TestReservation:
    def test_requires_at_least_one_guest(self, client_user):
        r = Reservation(client=client_user, date="2030-01-01", time="20:00", guests=0)
        with pytest.raises(ValidationError):
            r.full_clean()


class TestReview:
    def test_rating_must_be_1_to_5(self, client_user):
        cat = Category.objects.create(name="Plats")
        dish = Dish.objects.create(name="X", category=cat, price=Decimal("10"))
        bad = Review(client=client_user, dish=dish, rating=6)
        with pytest.raises(ValidationError):
            bad.full_clean()


class TestTable:
    def test_number_unique(self):
        Table.objects.create(number=1, capacity=4)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Table.objects.create(number=1, capacity=2)


class TestPromoCode:
    def test_percent_discount(self):
        promo = PromoCode.objects.create(
            code="WELCOME10", type=PromoType.PERCENT, value=Decimal("10")
        )
        assert promo.compute_discount(Decimal("200.00")) == Decimal("20.00")

    def test_fixed_discount_capped_at_total(self):
        promo = PromoCode.objects.create(
            code="FLAT50", type=PromoType.FIXED, value=Decimal("50")
        )
        assert promo.compute_discount(Decimal("30.00")) == Decimal("30.00")

    def test_min_order_blocks_discount(self):
        promo = PromoCode.objects.create(
            code="BIG", type=PromoType.PERCENT, value=Decimal("20"),
            min_order=Decimal("100"),
        )
        assert promo.compute_discount(Decimal("50.00")) == Decimal("0.00")

    def test_inactive_is_invalid(self):
        promo = PromoCode.objects.create(
            code="OFF", type=PromoType.FIXED, value=Decimal("10"), is_active=False
        )
        assert promo.is_valid() is False
