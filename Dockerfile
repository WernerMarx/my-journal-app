# syntax=docker/dockerfile:1

# --- Stage 1: build wheels for dependencies ---
FROM python:3.14-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Build deps for any source-only wheels (psycopg uses binary wheels, but keep gcc for safety).
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/ requirements/
RUN python -m pip install --upgrade pip \
    && pip wheel --wheel-dir /wheels -r requirements/production.txt


# --- Stage 2: slim runtime ---
FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# Runtime-only OS deps (libpq for psycopg).
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Install prebuilt wheels.
COPY --from=builder /wheels /wheels
COPY requirements/ requirements/
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements/production.txt \
    && rm -rf /wheels

# Non-root user.
RUN useradd --create-home --uid 1000 appuser
COPY . .
RUN chmod +x docker/entrypoint.sh && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
