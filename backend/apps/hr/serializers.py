from rest_framework import serializers

from .models import JobApplication, JobOffer, Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    employee_email = serializers.CharField(source="employee.email", read_only=True)

    class Meta:
        model = Schedule
        fields = [
            "id", "employee", "employee_name", "employee_email",
            "date", "shift_start", "shift_end", "role",
        ]

    def get_employee_name(self, obj) -> str:
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip() or obj.employee.email


class JobOfferSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(source="applications.count", read_only=True)

    class Meta:
        model = JobOffer
        fields = [
            "id", "title", "description", "requirements",
            "is_active", "applications_count", "created_at",
        ]
        read_only_fields = ["created_at"]


class JobApplicationSerializer(serializers.ModelSerializer):
    offer_title = serializers.CharField(source="offer.title", read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            "id", "offer", "offer_title", "candidate_name", "email", "phone",
            "cv", "cover_letter", "status", "created_at",
        ]
        read_only_fields = ["created_at"]
