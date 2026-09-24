import json
from rest_framework import serializers

from .models import Category, Dish, DishIngredient, Ingredient


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "display_order"]
        read_only_fields = ["slug"]


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = ["id", "name", "unit", "cost_per_unit"]


class DishIngredientSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient.unit", read_only=True)

    class Meta:
        model = DishIngredient
        fields = ["id", "ingredient", "ingredient_name", "unit", "quantity"]


class DishSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    dish_ingredients = DishIngredientSerializer(many=True, required=False)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Dish
        fields = [
            "id", "name", "description", "price", "category", "category_name",
            "image", "is_available", "prep_time", "dish_ingredients",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def to_internal_value(self, data):
        if "dish_ingredients" in data and isinstance(data["dish_ingredients"], str):
            try:
                if hasattr(data, "_mutable"):
                    data = data.copy()
                data["dish_ingredients"] = json.loads(data["dish_ingredients"])
            except json.JSONDecodeError:
                pass
        return super().to_internal_value(data)

    def create(self, validated_data):
        dish_ingredients = validated_data.pop("dish_ingredients", [])
        dish = Dish.objects.create(**validated_data)
        for di in dish_ingredients:
            DishIngredient.objects.create(dish=dish, **di)
        return dish

    def update(self, instance, validated_data):
        dish_ingredients = validated_data.pop("dish_ingredients", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if dish_ingredients is not None:
            instance.dish_ingredients.all().delete()
            for di in dish_ingredients:
                DishIngredient.objects.create(dish=instance, **di)
        return instance
