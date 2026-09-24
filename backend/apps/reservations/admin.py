from django.contrib import admin

from .models import Reservation


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("id", "date", "time", "guests", "status", "client", "guest_name", "table")
    list_filter = ("status", "date")
    search_fields = ("client__email", "guest_name", "guest_email")
    autocomplete_fields = ("client", "table")
    date_hierarchy = "date"
