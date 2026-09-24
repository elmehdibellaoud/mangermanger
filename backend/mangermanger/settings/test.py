"""Test settings — uses sqlite in-memory so tests run fast and without external services."""
from .base import *  # noqa: F401,F403

DEBUG = True
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CELERY_TASK_ALWAYS_EAGER = True
SENTIMENT_MODEL_ENABLED = False
