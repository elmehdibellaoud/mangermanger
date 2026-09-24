from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class ShiftRole(models.TextChoices):
    SERVEUR = "SERVEUR", "Serveur"
    CUISINIER = "CUISINIER", "Cuisinier"
    CAISSIER = "CAISSIER", "Caissier"
    MANAGER = "MANAGER", "Manager"


class Schedule(TimeStampedModel):
    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="schedules"
    )
    date = models.DateField()
    shift_start = models.TimeField()
    shift_end = models.TimeField()
    role = models.CharField(max_length=16, choices=ShiftRole.choices)

    class Meta:
        ordering = ["-date", "shift_start"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "date", "shift_start"],
                name="unique_shift_per_employee",
            ),
            models.CheckConstraint(
                check=models.Q(shift_end__gt=models.F("shift_start")),
                name="shift_end_after_start",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.employee.email} — {self.date} {self.shift_start:%H:%M}→{self.shift_end:%H:%M}"


class JobOffer(TimeStampedModel):
    title = models.CharField(max_length=150)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class ApplicationStatus(models.TextChoices):
    NEW = "NEW", "Nouvelle"
    REVIEWED = "REVIEWED", "Examinée"
    REJECTED = "REJECTED", "Rejetée"
    HIRED = "HIRED", "Embauchée"


class JobApplication(TimeStampedModel):
    offer = models.ForeignKey(JobOffer, on_delete=models.CASCADE, related_name="applications")
    candidate_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True)
    cv = models.FileField(upload_to="cvs/")
    cover_letter = models.TextField(blank=True)
    status = models.CharField(
        max_length=10, choices=ApplicationStatus.choices, default=ApplicationStatus.NEW
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.candidate_name} → {self.offer.title}"
