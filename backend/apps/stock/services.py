from decimal import Decimal
from django.db import transaction
from apps.stock.models import StockItem, StockMovement, MovementType


def deduct_stock_for_order(order):
    """
    Deducts required ingredients for all items in the given order from inventory.
    Records a StockMovement of type 'OUT' for each ingredient.
    """
    with transaction.atomic():
        for item in order.items.select_related("dish").all():
            dish = item.dish
            quantity_ordered = Decimal(str(item.quantity))
            
            # Find ingredients mapped to this dish
            dish_ingredients = dish.dish_ingredients.select_related("ingredient").all()
            for di in dish_ingredients:
                total_qty_needed = di.quantity * quantity_ordered
                
                # Get or create the stock item for this ingredient
                stock, _ = StockItem.objects.get_or_create(
                    ingredient=di.ingredient,
                    defaults={
                        "quantity": Decimal("0.000"),
                        "threshold_low": Decimal("0.000"),
                    }
                )
                
                # Record the stock movement
                StockMovement.objects.create(
                    ingredient=di.ingredient,
                    type=MovementType.OUT,
                    quantity=total_qty_needed,
                    reason=f"Déduction automatique (Commande #{order.id})",
                )
                
                # Deduct from physical stock
                stock.quantity = max(stock.quantity - total_qty_needed, Decimal("0.000"))
                stock.save(update_fields=["quantity", "updated_at"])
