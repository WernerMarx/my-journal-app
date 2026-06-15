"""Test settings: fast and hermetic. Used by pytest (see pytest.ini)."""

from .base import *  # noqa: F403

DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

# In-memory SQLite so the suite runs out-of-the-box without a Postgres server.
# The template uses no Postgres-specific SQL; CI/Docker still exercises Postgres
# through the development/production settings.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Fast password hashing for the test suite.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# In-memory email so verification flows can be asserted without SMTP.
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Mirror development: verification optional unless a test overrides it.
ACCOUNT_EMAIL_VERIFICATION = "optional"

# Run Celery tasks synchronously in-process.
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

CORS_ALLOW_ALL_ORIGINS = True
