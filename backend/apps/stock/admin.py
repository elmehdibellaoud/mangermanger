from django.contrib import admin

from .models import StockItem, StockMovement


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ("ingredient", "quantity", "threshold_low", "is_low", "updated_at")
    list_filter = ("ingredient__unit",)
    search_fields = ("ingredient__name",)

    @admin.display(boolean=True, description="Stock bas")
    def is_low(self, obj: StockItem) -> bool:
        return obj.is_low


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("ingredient", "type", "quantity", "created_by", "created_at")
    list_filter = ("type",)
    search_fields = ("ingredient__name", "reason")
    autocomplete_fields = ("ingredient", "created_by")
