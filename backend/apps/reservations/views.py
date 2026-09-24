from datetime import datetime

from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsGerant

from .models import Reservation, ReservationStatus
from .serializers import (
    AdminReservationSerializer,
    ReservationCreateSerializer,
    ReservationSerializer,
    find_available_table,
)


class PublicReservationCreateView(generics.CreateAPIView):
    """Book a table — anon (guest_* fields) or authenticated."""

    serializer_class = ReservationCreateSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        table = find_available_table(
            serializer.validated_data["date"],
            serializer.validated_data["time"],
            serializer.validated_data["guests"],
        )
        serializer.save(
            client=user,
            table=table,
            status=ReservationStatus.CONFIRMED if table else ReservationStatus.PENDING,
        )


class PublicAvailabilityView(APIView):
    """GET /public/availability/?date=YYYY-MM-DD&time=HH:MM&guests=N"""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            date = datetime.strptime(request.query_params["date"], "%Y-%m-%d").date()
            time = datetime.strptime(request.query_params["time"], "%H:%M").time()
            guests = int(request.query_params["guests"])
        except (KeyError, ValueError):
            return Response(
                {"detail": "Paramètres requis : date (YYYY-MM-DD), time (HH:MM), guests."},
                status=400,
            )
        table = find_available_table(date, time, guests)
        return Response({"available": bool(table), "capacity": table.capacity if table else None})


class MyReservationsView(generics.ListAPIView):
    """List current user's reservations."""

    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Reservation.objects.filter(client=self.request.user)
            .select_related("table")
            .order_by("-date", "-time")
        )


class AdminReservationViewSet(viewsets.ModelViewSet):
    """Full back-office reservation management."""

    serializer_class = AdminReservationSerializer
    permission_classes = [IsGerant]
    http_method_names = ["get", "patch", "post", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            Reservation.objects.select_related("table", "client")
            .order_by("-date", "-time")
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        return qs

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        resa = self.get_object()
        if not resa.table:
            resa.table = find_available_table(resa.date, resa.time, resa.guests)
        resa.status = ReservationStatus.CONFIRMED
        resa.save(update_fields=["status", "table", "updated_at"])
        return Response(self.get_serializer(resa).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        resa = self.get_object()
        resa.status = ReservationStatus.CANCELLED
        resa.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(resa).data)

    @action(detail=True, methods=["post"])
    def seat(self, request, pk=None):
        resa = self.get_object()
        resa.status = ReservationStatus.SEATED
        resa.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(resa).data)
