import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mangermanger.settings.dev")

app = Celery("mangermanger")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

from celery.schedules import crontab

app.conf.beat_schedule = {
    'expire-old-reservations': {
        'task': 'reservations.check_expired_reservations',
        'schedule': crontab(minute='*/15'),
    },
}
