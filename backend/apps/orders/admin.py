from django.contrib import admin

from .models import Order, OrderItem, Table


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    autocomplete_fields = ("dish",)
    readonly_fields = ("status",)


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ("number", "capacity", "status")
    list_filter = ("status",)
    search_fields = ("number",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "table", "client", "server", "status", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("client__email", "server__email")
    autocomplete_fields = ("table", "client", "server")
    inlines = [OrderItemInline]
    readonly_fields = ("created_at", "updated_at")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "dish", "quantity", "unit_price", "status")
    list_filter = ("status",)
    search_fields = ("dish__name",)
    autocomplete_fields = ("order", "dish")
