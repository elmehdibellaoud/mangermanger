from decimal import Decimal
from apps.promotions.models import LoyaltyAccount


def award_loyalty_points_for_order(order):
    """
    Awards loyalty points to the client associated with the order.
    Earns 1 point per 10 MAD of order total.
    Increments total spent on the loyalty account.
    """
    if not order.client:
        return
        
    # Get or create the client's loyalty account
    loyalty, _ = LoyaltyAccount.objects.get_or_create(client=order.client)
    
    # Calculate points earned (1 point per 10 MAD)
    points_earned = int(order.total // Decimal("10.00"))
    if points_earned > 0:
        loyalty.points += points_earned
        
    # Increment total spent
    loyalty.total_spent += order.total
    loyalty.save(update_fields=["points", "total_spent", "updated_at"])
