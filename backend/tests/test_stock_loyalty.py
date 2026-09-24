from decimal import Decimal
import pytest
from rest_framework.test import APIClient
from apps.accounts.models import Role, User
from apps.menu.models import Category, Dish, DishIngredient, Ingredient, Unit
from apps.orders.models import Order, OrderItem, OrderStatus, Table
from apps.stock.models import StockItem, StockMovement, MovementType
from apps.promotions.models import LoyaltyAccount

pytestmark = pytest.mark.django_db


@pytest.fixture
def order_setup():
    # Setup Category, Ingredient, Dish, and DishIngredient
    cat = Category.objects.create(name="Plats")
    ing = Ingredient.objects.create(name="Poulet", unit=Unit.KG, cost_per_unit=Decimal("50.00"))
    dish = Dish.objects.create(name="Tajine", category=cat, price=Decimal("100.00"))
    
    DishIngredient.objects.create(dish=dish, ingredient=ing, quantity=Decimal("0.250"))
    
    # Setup StockItem
    stock = StockItem.objects.create(ingredient=ing, quantity=Decimal("10.000"), threshold_low=Decimal("1.000"))
    
    # Setup Table, Client, Server
    table = Table.objects.create(number=5, capacity=4)
    client = User.objects.create_user(email="client@test.dev", password="pw", role=Role.CLIENT)
    server = User.objects.create_user(email="server@test.dev", password="pw", role=Role.SERVEUR)
    
    # Setup Order and OrderItem
    order = Order.objects.create(table=table, client=client, server=server, status=OrderStatus.READY, total=Decimal("200.00"))
    OrderItem.objects.create(order=order, dish=dish, quantity=2, unit_price=Decimal("100.00"))
    
    return {
        "ing": ing,
        "dish": dish,
        "stock": stock,
        "client": client,
        "order": order,
        "server": server,
    }


def test_stock_deduction_on_order_pay(order_setup):
    order = order_setup["order"]
    ing = order_setup["ing"]
    
    # Authenticate as server to call pay endpoint
    api = APIClient()
    api.force_authenticate(order_setup["server"])
    
    r = api.patch(f"/api/staff/orders/{order.id}/pay/")
    assert r.status_code == 200
    
    # Verify stock deducted: 10kg - (2 orders * 0.250kg) = 9.5kg
    stock_item = StockItem.objects.get(ingredient=ing)
    assert stock_item.quantity == Decimal("9.500")
    
    # Verify stock movement recorded
    movement = StockMovement.objects.filter(ingredient=ing, type=MovementType.OUT).first()
    assert movement is not None
    assert movement.quantity == Decimal("0.500")
    assert "Déduction automatique" in movement.reason


def test_loyalty_points_on_order_pay(order_setup):
    order = order_setup["order"]
    client = order_setup["client"]
    
    # Authenticate as server to call pay endpoint
    api = APIClient()
    api.force_authenticate(order_setup["server"])
    
    r = api.patch(f"/api/staff/orders/{order.id}/pay/")
    assert r.status_code == 200
    
    # Verify loyalty account created and points credited: 200 MAD // 10 = 20 points
    loyalty = LoyaltyAccount.objects.get(client=client)
    assert loyalty.points == 20
    assert loyalty.total_spent == Decimal("200.00")
