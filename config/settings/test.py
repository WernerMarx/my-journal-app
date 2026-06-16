"""Test settings: fast and hermetic. Used by pytest (see pytest.ini).

Database: PostgreSQL, not SQLite. Search relies on Postgres-only features
(pg_trgm, SearchVectorField, GIN indexes), so the test suite must run against
a real Postgres instance. pytest-django creates and destroys 'test_<dbname>'
automatically using the DATABASE_URL from the environment.

Local: ensure DATABASE_URL in .env points to a reachable Postgres instance.
CI: the workflow provides a Postgres service and sets DATABASE_URL.
"""

from .base import *  # noqa: F403

DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

# Inherits DATABASES from base.py (reads DATABASE_URL); pytest-django creates
# test_<dbname> automatically. No SQLite override.

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
