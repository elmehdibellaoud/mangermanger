from datetime import datetime, timedelta

from celery import shared_task
from django.utils import timezone

from .models import Reservation, ReservationStatus


@shared_task(name="reservations.check_expired_reservations")
def check_expired_reservations():
    """
    Check all PENDING and CONFIRMED reservations.
    If the current time is more than 30 minutes past their scheduled date and time,
    mark them as EXPIRED.
    """
    now = timezone.now()
    # We query reservations that are PENDING or CONFIRMED
    reservations = Reservation.objects.filter(
        status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
    )

    expired_count = 0
    for res in reservations:
        # Combine res.date and res.time into a timezone-aware datetime
        # We assume the restaurant operates in the timezone configured in settings (e.g. UTC or local)
        res_datetime_naive = datetime.combine(res.date, res.time)
        res_datetime_aware = timezone.make_aware(res_datetime_naive)
        
        # If the reservation time + 30 minutes is strictly in the past
        if now > res_datetime_aware + timedelta(minutes=30):
            res.status = ReservationStatus.EXPIRED
            res.save(update_fields=["status", "updated_at"])
            expired_count += 1

    return f"Expired {expired_count} reservations."
