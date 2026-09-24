from rest_framework import serializers

from apps.menu.models import Ingredient

from .models import MovementType, StockItem, StockMovement


class StockItemSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.unit", read_only=True)
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockItem
        fields = [
            "id", "ingredient", "ingredient_name", "unit",
            "quantity", "threshold_low", "is_low", "updated_at",
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id", "ingredient", "ingredient_name", "type", "type_display",
            "quantity", "reason", "created_by", "created_at",
        ]
        read_only_fields = ["created_by", "created_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        movement = StockMovement.objects.create(
            created_by=request.user if request else None,
            **validated_data,
        )
        # Apply to stock level
        ingredient: Ingredient = movement.ingredient
        stock, _ = StockItem.objects.get_or_create(ingredient=ingredient)
        if movement.type == MovementType.IN:
            stock.quantity += movement.quantity
        elif movement.type == MovementType.OUT:
            stock.quantity = max(stock.quantity - movement.quantity, 0)
        else:  # ADJUST
            stock.quantity = movement.quantity
        stock.save(update_fields=["quantity", "updated_at"])
        return movement
