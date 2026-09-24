from django.contrib import admin

from .models import JobApplication, JobOffer, Schedule


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ("employee", "date", "shift_start", "shift_end", "role")
    list_filter = ("role", "date")
    search_fields = ("employee__email",)
    autocomplete_fields = ("employee",)
    date_hierarchy = "date"


@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("title", "description")


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ("candidate_name", "offer", "email", "status", "created_at")
    list_filter = ("status", "offer")
    search_fields = ("candidate_name", "email")
    autocomplete_fields = ("offer",)
