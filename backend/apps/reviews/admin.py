from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "dish", "client", "rating", "sentiment", "sentiment_score", "is_approved", "created_at")
    list_filter = ("sentiment", "is_approved", "rating")
    search_fields = ("dish__name", "client__email", "comment")
    autocomplete_fields = ("dish", "client")
    readonly_fields = ("sentiment", "sentiment_score", "analyzed_at", "created_at", "updated_at")
    date_hierarchy = "created_at"
