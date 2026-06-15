# Django REST API Base Template

A clone-and-go Django backend: custom email-based user model, DRF, SimpleJWT,
environment-split settings, Celery, OpenAPI docs, pytest, and Docker. No
domain logic — add your business apps on top.

See [CLAUDE.md](CLAUDE.md) for architectural decisions and [PLAN.md](PLAN.md) for
the full blueprint.

## Stack

- **Python 3.14**, **Django 5.2 LTS**, **Django REST Framework**
- **Auth**: Django-owned. `apps.users.User` (email login, no username),
  `dj-rest-auth` + `allauth` for account flows, **SimpleJWT** as the single API
  token system (Bearer header). `allauth.socialaccount` is wired for future
  Google/Microsoft providers; no provider is enabled yet.
- **PostgreSQL** (psycopg 3), **Celery + Redis**, **drf-spectacular** docs
- **Settings** split: `config/settings/{base,development,production,test}.py`,
  selected by `DJANGO_SETTINGS_MODULE`.

## Quick start (local, no Docker)

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements/development.txt

Copy-Item .env.example .env      # then edit values as needed
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

`manage.py` defaults `DJANGO_SETTINGS_MODULE` to `config.settings.development`.

> Local dev expects a reachable Postgres (see `DATABASE_URL`). The **test**
> settings use in-memory SQLite, so `pytest` runs with no database server.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
docker compose run --rm web python manage.py createsuperuser
```

Brings up `db` (Postgres 16), `redis` (7), `web` (gunicorn), and a Celery
`worker`. The web container waits for the DB, migrates, and collects static on
start.

## Tests & quality

```powershell
python -m pytest                 # full suite (SQLite, no server needed)
python -m pytest -k users        # subset
python -m pytest --cov           # coverage

python -m ruff check .           # lint
python -m ruff format .          # format
```

## API surface

Versioned under `/api/v1/`.

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/v1/health/` | Liveness probe (no auth) |
| `POST` | `/api/v1/auth/registration/` | Register (email + password) |
| `POST` | `/api/v1/auth/login/` | Obtain JWT access/refresh |
| `POST` | `/api/v1/auth/logout/` | Logout / blacklist refresh |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh access token |
| `POST` | `/api/v1/auth/password/reset/` | Start password reset |
| `GET`/`PATCH` | `/api/v1/users/me/` | Current user details |
| `GET`  | `/api/schema/` | OpenAPI schema |
| `GET`  | `/api/docs/` · `/api/redoc/` | Swagger UI · Redoc |

Authenticate API requests with `Authorization: Bearer <access_token>`.

### Email verification

Controlled per-environment via `ACCOUNT_EMAIL_VERIFICATION`:

- **development / test** → `optional`: registration returns JWTs immediately.
- **production** → `mandatory`: registration returns a "verify your email"
  response and **withholds** tokens until the address is confirmed and the user
  logs in.

## Layout

```
config/            settings split, root urls, asgi/wsgi, celery
apps/core/         shared base models, pagination, health check
apps/users/        custom user, manager, auth serializers/views, admin
tests/             pytest suite (mirrors apps/)
requirements/      base / development / production
docker/            entrypoint
```

## Adding an app

```powershell
python manage.py startapp myapp apps\myapp   # create the package first
```

Set its `AppConfig.name` to `apps.myapp` (with a short `label`), add
`"apps.myapp"` to `LOCAL_APPS` in `config/settings/base.py`, and mount its
`urls.py` under `/api/v1/` in `config/urls.py`.
