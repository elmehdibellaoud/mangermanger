from rest_framework import permissions, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.common.permissions import IsGerant, ReadOnlyOrGerant

from .models import JobApplication, JobOffer, Schedule
from .serializers import (
    JobApplicationSerializer,
    JobOfferSerializer,
    ScheduleSerializer,
)


class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.select_related("employee").all()
    serializer_class = ScheduleSerializer
    permission_classes = [IsGerant]

    def get_queryset(self):
        qs = super().get_queryset()
        week_start = self.request.query_params.get("week_start")
        week_end = self.request.query_params.get("week_end")
        if week_start and week_end:
            qs = qs.filter(date__gte=week_start, date__lte=week_end)
        return qs


class JobOfferViewSet(viewsets.ModelViewSet):
    """GET is public; writes require gérant."""

    queryset = JobOffer.objects.all()
    serializer_class = JobOfferSerializer
    permission_classes = [ReadOnlyOrGerant]


class JobApplicationViewSet(viewsets.ModelViewSet):
    queryset = JobApplication.objects.select_related("offer").all()
    serializer_class = JobApplicationSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        # Anyone can POST (apply), but listing/editing requires gérant
        if self.action == "create":
            return [permissions.AllowAny()]
        return [IsGerant()]
