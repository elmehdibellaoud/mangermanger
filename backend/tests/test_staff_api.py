"""Phase 3 tests: serveur + KDS flow."""
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish
from apps.orders.models import OrderStatus, Table, TableStatus

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def serveur():
    return User.objects.create_user(
        email="sv@x.y", password="pw12345!", role=Role.SERVEUR
    )


@pytest.fixture
def cuisinier():
    return User.objects.create_user(
        email="ck@x.y", password="pw12345!", role=Role.CUISINIER
    )


@pytest.fixture
def client_user():
    return User.objects.create_user(
        email="cl@x.y", password="pw12345!", role=Role.CLIENT
    )


@pytest.fixture
def setup_menu():
    cat = Category.objects.create(name="Plats")
    dish1 = Dish.objects.create(name="Pizza", category=cat, price=Decimal("80"))
    dish2 = Dish.objects.create(name="Pasta", category=cat, price=Decimal("65"))
    return {"cat": cat, "dish1": dish1, "dish2": dish2}


@pytest.fixture
def setup_tables():
    return [Table.objects.create(number=i, capacity=4) for i in range(1, 4)]


class TestStaffPermissions:
    def test_client_forbidden(self, api, client_user):
        api.force_authenticate(client_user)
        assert api.get("/api/staff/tables/").status_code == 403
        assert api.get("/api/staff/kds/orders/").status_code == 403

    def test_serveur_can_see_tables_and_orders(self, api, serveur):
        api.force_authenticate(serveur)
        assert api.get("/api/staff/tables/").status_code == 200
        assert api.get("/api/staff/orders/").status_code == 200

    def test_serveur_forbidden_from_kds_mutations(self, api, serveur):
        api.force_authenticate(serveur)
        assert api.get("/api/staff/kds/orders/").status_code == 403


class TestFullOrderFlow:
    def test_happy_path(self, api, serveur, cuisinier, setup_menu, setup_tables):
        table = setup_tables[0]
        dish1, dish2 = setup_menu["dish1"], setup_menu["dish2"]

        # --- Serveur creates order ---
        api.force_authenticate(serveur)
        r = api.post("/api/staff/orders/", {"table": table.id}, format="json")
        assert r.status_code == 201, r.data
        order_id = r.data["id"]
        table.refresh_from_db()
        assert table.status == TableStatus.OCCUPIED

        # --- Add 2 items ---
        r = api.post(
            f"/api/staff/orders/{order_id}/items/",
            {"dish": dish1.id, "quantity": 2},
            format="json",
        )
        assert r.status_code == 201
        item1_id = r.data["id"]
        r = api.post(
            f"/api/staff/orders/{order_id}/items/",
            {"dish": dish2.id, "quantity": 1},
            format="json",
        )
        assert r.status_code == 201
        item2_id = r.data["id"]

        # Total should be 2*80 + 1*65 = 225
        detail = api.get(f"/api/staff/orders/{order_id}/").data
        assert Decimal(detail["total"]) == Decimal("225.00")

        # --- Send to kitchen ---
        r = api.patch(f"/api/staff/orders/{order_id}/send/")
        assert r.status_code == 200
        assert r.data["status"] == OrderStatus.SENT

        # --- KDS sees the order ---
        api.force_authenticate(cuisinier)
        r = api.get("/api/staff/kds/orders/")
        assert r.status_code == 200
        assert len(r.data) == 1

        # Start item 1 → promotes order to PREPARING
        r = api.patch(f"/api/staff/kds/items/{item1_id}/start/")
        assert r.status_code == 200
        detail = api.get("/api/staff/kds/orders/").data[0]
        assert detail["status"] == OrderStatus.PREPARING

        # Mark both items READY → order status READY
        api.patch(f"/api/staff/kds/items/{item1_id}/ready/")
        api.patch(f"/api/staff/kds/items/{item2_id}/ready/")

        # --- Serveur sees it ready ---
        api.force_authenticate(serveur)
        detail = api.get(f"/api/staff/orders/{order_id}/").data
        assert detail["status"] == OrderStatus.READY

        # Serve + pay
        api.patch(f"/api/staff/orders/{order_id}/serve/")
        r = api.patch(f"/api/staff/orders/{order_id}/pay/")
        assert r.status_code == 200
        assert r.data["status"] == OrderStatus.PAID

        table.refresh_from_db()
        assert table.status == TableStatus.FREE

    def test_cannot_send_empty_order(self, api, serveur, setup_tables):
        api.force_authenticate(serveur)
        r = api.post("/api/staff/orders/", {"table": setup_tables[0].id}, format="json")
        order_id = r.data["id"]
        r = api.patch(f"/api/staff/orders/{order_id}/send/")
        assert r.status_code == 400

    def test_cannot_create_two_orders_on_same_table(self, api, serveur, setup_tables):
        api.force_authenticate(serveur)
        api.post("/api/staff/orders/", {"table": setup_tables[0].id}, format="json")
        r = api.post("/api/staff/orders/", {"table": setup_tables[0].id}, format="json")
        assert r.status_code == 400

    def test_remove_item_updates_total(self, api, serveur, setup_menu, setup_tables):
        api.force_authenticate(serveur)
        r = api.post("/api/staff/orders/", {"table": setup_tables[0].id}, format="json")
        order_id = r.data["id"]
        r = api.post(
            f"/api/staff/orders/{order_id}/items/",
            {"dish": setup_menu["dish1"].id, "quantity": 2},
            format="json",
        )
        item_id = r.data["id"]
        api.delete(f"/api/staff/orders/{order_id}/items/{item_id}/")
        detail = api.get(f"/api/staff/orders/{order_id}/").data
        assert Decimal(detail["total"]) == Decimal("0.00")

    def test_mine_filter_scopes_to_current_server(self, api, setup_menu, setup_tables):
        serveur_a = User.objects.create_user(email="a@x.y", password="pw", role=Role.SERVEUR)
        serveur_b = User.objects.create_user(email="b@x.y", password="pw", role=Role.SERVEUR)
        api.force_authenticate(serveur_a)
        api.post("/api/staff/orders/", {"table": setup_tables[0].id}, format="json")
        api.force_authenticate(serveur_b)
        api.post("/api/staff/orders/", {"table": setup_tables[1].id}, format="json")
        r = api.get("/api/staff/orders/?mine=1")
        emails = {o["server_email"] for o in r.data["results"]}
        assert emails == {serveur_b.email}


class TestPublicMenu:
    def test_menu_groups_by_category(self, api, setup_menu):
        r = api.get("/api/public/menu/")
        assert r.status_code == 200
        cats = r.data["categories"]
        assert len(cats) == 1
        assert len(cats[0]["dishes"]) == 2

    def test_unavailable_dishes_hidden(self, api, setup_menu):
        setup_menu["dish1"].is_available = False
        setup_menu["dish1"].save()
        r = api.get("/api/public/menu/")
        cat = r.data["categories"][0]
        assert len(cat["dishes"]) == 1
        assert cat["dishes"][0]["name"] == "Pasta"


class TestTableReservation:
    def test_tables_endpoint_shows_today_reservation(self, api, serveur, setup_tables, client_user):
        from django.utils import timezone

        from apps.reservations.models import Reservation, ReservationStatus
        table = setup_tables[0]
        today = timezone.localdate()
        Reservation.objects.create(
            table=table, client=client_user, date=today, time="20:00", guests=2,
            status=ReservationStatus.CONFIRMED,
        )
        api.force_authenticate(serveur)
        r = api.get("/api/staff/tables/")
        row = next(t for t in r.data if t["id"] == table.id)
        assert row["today_reservation"]["client_id"] == client_user.id
        assert row["today_reservation"]["time"] == "20:00"

    def test_other_day_reservation_hidden(self, api, serveur, setup_tables, client_user):
        from apps.reservations.models import Reservation, ReservationStatus
        Reservation.objects.create(
            table=setup_tables[0], client=client_user, date="2030-01-01", time="20:00",
            guests=2, status=ReservationStatus.CONFIRMED,
        )
        api.force_authenticate(serveur)
        r = api.get("/api/staff/tables/")
        row = next(t for t in r.data if t["id"] == setup_tables[0].id)
        assert row["today_reservation"] is None


class TestAttachClient:
    def test_order_create_with_client(self, api, serveur, client_user, setup_tables):
        api.force_authenticate(serveur)
        r = api.post(
            "/api/staff/orders/",
            {"table": setup_tables[0].id, "client": client_user.id},
            format="json",
        )
        assert r.status_code == 201, r.data
        from apps.orders.models import Order
        order = Order.objects.get(pk=r.data["id"])
        assert order.client_id == client_user.id

    def test_attach_client_action(self, api, serveur, client_user, setup_tables):
        api.force_authenticate(serveur)
        r = api.post("/api/staff/orders/", {"table": setup_tables[0].id}, format="json")
        order_id = r.data["id"]
        r = api.patch(
            f"/api/staff/orders/{order_id}/attach_client/",
            {"client": client_user.id},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["client"] == client_user.id

    def test_detach_client(self, api, serveur, client_user, setup_tables):
        api.force_authenticate(serveur)
        r = api.post(
            "/api/staff/orders/",
            {"table": setup_tables[0].id, "client": client_user.id},
            format="json",
        )
        order_id = r.data["id"]
        api.patch(f"/api/staff/orders/{order_id}/attach_client/", {"client": None}, format="json")
        r = api.get(f"/api/staff/orders/{order_id}/")
        assert r.data["client"] is None


class TestClientSearch:
    def test_serveur_can_search_by_email(self, api, serveur, client_user):
        api.force_authenticate(serveur)
        r = api.get(f"/api/staff/clients/search/?q={client_user.email[:3]}")
        assert r.status_code == 200
        assert any(u["email"] == client_user.email for u in r.data)

    def test_client_blocked_from_search(self, api, client_user):
        api.force_authenticate(client_user)
        r = api.get("/api/staff/clients/search/?q=x")
        assert r.status_code == 403
