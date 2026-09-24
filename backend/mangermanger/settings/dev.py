from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Lightweight default to avoid torch import in dev if unset
SENTIMENT_MODEL_ENABLED = False
