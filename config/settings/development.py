"""Development settings: convenient and verbose, never for production."""

from .base import *  # noqa: F403
from .base import INSTALLED_APPS, MIDDLEWARE, env

DEBUG = True
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Email to the console so verification links are visible in the dev server logs.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Email verification is OPTIONAL in dev so registration/login testing stays simple;
# tokens may be issued at registration.
ACCOUNT_EMAIL_VERIFICATION = "optional"

# --- CORS: permissive locally ---
CORS_ALLOW_ALL_ORIGINS = True

# --- django-debug-toolbar ---
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")
INTERNAL_IPS = ["127.0.0.1"]
