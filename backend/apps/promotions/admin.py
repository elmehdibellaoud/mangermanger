from django.contrib import admin

from .models import LoyaltyAccount, PromoCode


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "type", "value", "used_count", "max_uses", "expires_at", "is_active")
    list_filter = ("type", "is_active")
    search_fields = ("code",)


@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(admin.ModelAdmin):
    list_display = ("client", "points", "total_spent")
    search_fields = ("client__email",)
    autocomplete_fields = ("client",)
