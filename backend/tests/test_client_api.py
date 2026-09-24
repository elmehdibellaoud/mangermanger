"""Phase 4 tests: public + client portal."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish
from apps.orders.models import Order, OrderItem, OrderStatus, Table
from apps.promotions.models import PromoCode, PromoType
from apps.reservations.models import Reservation, ReservationStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def client_user():
    return User.objects.create_user(email="cl@x.y", password="pw", role=Role.CLIENT)


@pytest.fixture
def other_client():
    return User.objects.create_user(email="ol@x.y", password="pw", role=Role.CLIENT)


@pytest.fixture
def menu():
    cat = Category.objects.create(name="Plats")
    return {
        "cat": cat,
        "dish": Dish.objects.create(name="Pizza", category=cat, price=Decimal("80")),
        "dish2": Dish.objects.create(name="Pasta", category=cat, price=Decimal("65")),
    }


class TestRegister:
    def test_register_creates_client(self, api):
        r = api.post(
            "/api/auth/register/",
            {"email": "new@example.com", "password": "pw12345!", "first_name": "Sara"},
            format="json",
        )
        assert r.status_code == 201
        u = User.objects.get(email="new@example.com")
        assert u.role == Role.CLIENT


class TestPublicDishDetail:
    def test_dish_detail_with_reviews(self, api, menu, client_user):
        from apps.reviews.models import Review
        Review.objects.create(client=client_user, dish=menu["dish"], rating=5, comment="Top", is_approved=True)
        Review.objects.create(client=client_user, dish=menu["dish"], rating=3, comment="Plat correct, sans plus.", is_approved=True)
        r = api.get(f"/api/public/dishes/{menu['dish'].id}/")
        assert r.status_code == 200
        assert r.data["rating_count"] == 2
        assert r.data["rating_average"] == 4.0
        assert len(r.data["reviews"]) == 2

    def test_unavailable_dish_404(self, api, menu):
        menu["dish"].is_available = False
        menu["dish"].save()
        assert api.get(f"/api/public/dishes/{menu['dish'].id}/").status_code == 404

    def test_can_review_flag_for_ordered_client(self, api, menu, client_user):
        order = Order.objects.create(client=client_user, status=OrderStatus.PAID)
        OrderItem.objects.create(order=order, dish=menu["dish"], quantity=1, unit_price=Decimal("80"))
        api.force_authenticate(client_user)
        r = api.get(f"/api/public/dishes/{menu['dish'].id}/")
        assert r.data["can_review"] is True
        assert r.data["already_reviewed"] is False

    def test_can_review_false_when_not_ordered(self, api, menu, client_user):
        api.force_authenticate(client_user)
        r = api.get(f"/api/public/dishes/{menu['dish'].id}/")
        assert r.data["can_review"] is False

    def test_already_reviewed_flag(self, api, menu, client_user):
        from apps.reviews.models import Review
        order = Order.objects.create(client=client_user, status=OrderStatus.PAID)
        OrderItem.objects.create(order=order, dish=menu["dish"], quantity=1, unit_price=Decimal("80"))
        Review.objects.create(client=client_user, dish=menu["dish"], rating=5, comment="Top", is_approved=True)
        api.force_authenticate(client_user)
        r = api.get(f"/api/public/dishes/{menu['dish'].id}/")
        assert r.data["already_reviewed"] is True
        assert r.data["can_review"] is False


class TestAdminReservations:
    def test_list_requires_gerant(self, api, client_user):
        api.force_authenticate(client_user)
        r = api.get("/api/admin/reservations/")
        assert r.status_code == 403

    def test_admin_can_list_and_filter(self, api):
        from apps.accounts.models import Role, User
        from apps.reservations.models import Reservation, ReservationStatus
        gerant = User.objects.create_user(email="g@example.com", password="pw", role=Role.GERANT)
        Reservation.objects.create(
            guest_name="X", guest_email="x@example.com", date="2030-06-01", time="20:00",
            guests=2, status=ReservationStatus.CONFIRMED,
        )
        Reservation.objects.create(
            guest_name="Y", guest_email="y@example.com", date="2030-07-01", time="20:00",
            guests=2, status=ReservationStatus.PENDING,
        )
        api.force_authenticate(gerant)
        assert api.get("/api/admin/reservations/").data["count"] == 2
        assert api.get("/api/admin/reservations/?status=CONFIRMED").data["count"] == 1

    def test_confirm_cancel_actions(self, api):
        from apps.accounts.models import Role, User
        from apps.orders.models import Table
        from apps.reservations.models import Reservation, ReservationStatus
        Table.objects.create(number=1, capacity=4)
        gerant = User.objects.create_user(email="g@example.com", password="pw", role=Role.GERANT)
        resa = Reservation.objects.create(
            guest_name="X", guest_email="x@example.com", date="2030-06-01", time="20:00",
            guests=2, status=ReservationStatus.PENDING,
        )
        api.force_authenticate(gerant)
        r = api.post(f"/api/admin/reservations/{resa.id}/confirm/")
        assert r.status_code == 200
        resa.refresh_from_db()
        assert resa.status == ReservationStatus.CONFIRMED
        assert resa.table is not None

        api.post(f"/api/admin/reservations/{resa.id}/cancel/")
        resa.refresh_from_db()
        assert resa.status == ReservationStatus.CANCELLED


class TestPublicReservation:
    def test_anonymous_reservation_works_if_name_email_provided(self, api):
        Table.objects.create(number=1, capacity=4)
        r = api.post(
            "/api/public/reservations/",
            {
                "guest_name": "Sara",
                "guest_email": "sara@example.com",
                "date": "2030-06-01",
                "time": "20:00",
                "guests": 2,
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        resa = Reservation.objects.first()
        assert resa.client_id is None
        assert resa.status == ReservationStatus.CONFIRMED
        assert resa.table is not None

    def test_anonymous_reservation_rejects_without_email(self, api):
        Table.objects.create(number=1, capacity=4)
        r = api.post(
            "/api/public/reservations/",
            {"date": "2030-06-01", "time": "20:00", "guests": 2},
            format="json",
        )
        assert r.status_code == 400

    def test_auth_reservation_associates_client(self, api, client_user):
        Table.objects.create(number=1, capacity=4)
        api.force_authenticate(client_user)
        r = api.post(
            "/api/public/reservations/",
            {"date": "2030-06-01", "time": "19:00", "guests": 2},
            format="json",
        )
        assert r.status_code == 201
        assert Reservation.objects.first().client == client_user

    def test_availability_returns_false_when_overlapping(self, api):
        t = Table.objects.create(number=1, capacity=2)
        Reservation.objects.create(
            table=t, date="2030-06-01", time="20:00", guests=2,
            guest_name="X", guest_email="x@x.y",
            status=ReservationStatus.CONFIRMED,
        )
        r = api.get("/api/public/availability/?date=2030-06-01&time=20:30&guests=2")
        assert r.data["available"] is False


class TestClientReview:
    def test_cannot_review_non_ordered_dish(self, api, client_user, menu):
        api.force_authenticate(client_user)
        r = api.post(
            "/api/client/reviews/",
            {"dish": menu["dish"].id, "rating": 5, "comment": "Super"},
            format="json",
        )
        assert r.status_code == 403

    def test_can_review_ordered_dish(self, api, client_user, menu):
        order = Order.objects.create(client=client_user, status=OrderStatus.PAID)
        OrderItem.objects.create(order=order, dish=menu["dish"], quantity=1, unit_price=Decimal("80"))
        api.force_authenticate(client_user)
        r = api.post(
            "/api/client/reviews/",
            {"dish": menu["dish"].id, "rating": 5, "comment": "Super"},
            format="json",
        )
        assert r.status_code == 201


class TestClientProfile:
    def test_profile_update_modifies_nested_fields(self, api, client_user):
        api.force_authenticate(client_user)
        r = api.patch(
            "/api/client/profile/",
            {"first_name": "Sara", "phone": "+212600000000"},
            format="json",
        )
        assert r.status_code == 200
        client_user.refresh_from_db()
        assert client_user.first_name == "Sara"
        assert client_user.profile.phone == "+212600000000"

    def test_profile_is_scoped_to_request_user(self, api, client_user, other_client):
        api.force_authenticate(client_user)
        r = api.get("/api/client/profile/")
        assert r.data["email"] == client_user.email


class TestClientOrders:
    def test_only_sees_own_orders(self, api, client_user, other_client):
        Order.objects.create(client=client_user, status=OrderStatus.PAID)
        Order.objects.create(client=other_client, status=OrderStatus.PAID)
        api.force_authenticate(client_user)
        r = api.get("/api/client/orders/")
        assert r.data["count"] == 1


class TestPromoValidate:
    def test_valid_percent(self, api, client_user):
        PromoCode.objects.create(code="WELCOME10", type=PromoType.PERCENT, value=Decimal("10"))
        api.force_authenticate(client_user)
        r = api.post(
            "/api/client/promo/validate/",
            {"code": "welcome10", "order_total": "200.00"},
            format="json",
        )
        assert r.data["valid"] is True
        assert r.data["discount"] == "20.00"
        assert r.data["final_total"] == "180.00"

    def test_expired_code_rejected(self, api, client_user):
        from datetime import timedelta

        from django.utils import timezone
        PromoCode.objects.create(
            code="OLD", type=PromoType.FIXED, value=Decimal("50"),
            expires_at=timezone.now() - timedelta(days=1),
        )
        api.force_authenticate(client_user)
        r = api.post(
            "/api/client/promo/validate/",
            {"code": "OLD", "order_total": "100.00"},
            format="json",
        )
        assert r.data["valid"] is False
