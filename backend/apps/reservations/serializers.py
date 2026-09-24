
from rest_framework import serializers

from apps.orders.models import Table

from .models import Reservation, ReservationStatus

SLOT_MINUTES = 90  # assume a reservation occupies a table for 90 min


class ReservationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    table_number = serializers.IntegerField(source="table.number", read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id", "client", "guest_name", "guest_email", "guest_phone",
            "date", "time", "guests", "table", "table_number",
            "status", "status_display", "notes", "created_at",
        ]
        read_only_fields = ["client", "status", "table", "created_at"]


class AdminReservationSerializer(serializers.ModelSerializer):
    """Admin-facing: status/client/table are fully writable."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    table_number = serializers.IntegerField(source="table.number", read_only=True)
    client_email = serializers.CharField(source="client.email", read_only=True, default=None)

    class Meta:
        model = Reservation
        fields = [
            "id", "client", "client_email", "guest_name", "guest_email", "guest_phone",
            "date", "time", "guests", "table", "table_number",
            "status", "status_display", "notes", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        has_client = attrs.get("client") or (self.instance and self.instance.client_id)
        has_guest = attrs.get("guest_name") or (self.instance and self.instance.guest_name)
        if not has_client and not has_guest:
            raise serializers.ValidationError(
                "Associez la réservation à un client existant ou saisissez un nom d'invité."
            )
        return attrs


class ReservationCreateSerializer(serializers.ModelSerializer):
    """Accepts both anonymous (email/name required) and authenticated bookings."""

    class Meta:
        model = Reservation
        fields = [
            "id", "guest_name", "guest_email", "guest_phone",
            "date", "time", "guests", "notes",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        request = self.context.get("request")
        if not (request and request.user.is_authenticated):
            if not attrs.get("guest_email") or not attrs.get("guest_name"):
                raise serializers.ValidationError(
                    "Nom et email sont requis pour une réservation sans compte."
                )
        return attrs


def find_available_table(date, time, guests: int) -> Table | None:
    """Return the smallest available table that seats the party, or None."""
    candidates = (
        Table.objects.filter(capacity__gte=guests)
        .order_by("capacity", "number")
    )
    slot_start = time
    # Conflict = any reservation on the same date within ±SLOT_MINUTES
    for table in candidates:
        conflicts = Reservation.objects.filter(
            table=table,
            date=date,
            status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        )
        conflict = False
        for r in conflicts:
            delta = abs(
                (r.time.hour * 60 + r.time.minute)
                - (slot_start.hour * 60 + slot_start.minute)
            )
            if delta < SLOT_MINUTES:
                conflict = True
                break
        if not conflict:
            return table
    return None
