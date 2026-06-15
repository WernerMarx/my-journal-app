#!/usr/bin/env bash
# Container entrypoint: wait for Postgres, apply migrations, collect static, then
# exec the container command (gunicorn by default, or celery for the worker).
set -euo pipefail

echo "Waiting for the database..."
python <<'PY'
import os
import time

import psycopg

dsn = os.environ["DATABASE_URL"]
for attempt in range(30):
    try:
        with psycopg.connect(dsn, connect_timeout=2):
            break
    except Exception as exc:  # noqa: BLE001
        print(f"  db not ready ({attempt + 1}/30): {exc}")
        time.sleep(2)
else:
    raise SystemExit("Database did not become available in time.")
print("Database is up.")
PY

# Only the web process needs migrations/static; harmless if a worker runs them too,
# but we guard so the worker starts faster.
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
    echo "Applying migrations..."
    python manage.py migrate --noinput
    echo "Collecting static files..."
    python manage.py collectstatic --noinput
fi

exec "$@"
