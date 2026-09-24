from django.contrib import admin

from .models import Category, Dish, DishIngredient, Ingredient


class DishIngredientInline(admin.TabularInline):
    model = DishIngredient
    extra = 1
    autocomplete_fields = ("ingredient",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "display_order")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("name", "unit", "cost_per_unit")
    list_filter = ("unit",)
    search_fields = ("name",)


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "is_available", "prep_time")
    list_filter = ("category", "is_available")
    search_fields = ("name", "description")
    inlines = [DishIngredientInline]
    autocomplete_fields = ("category",)
