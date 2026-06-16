# Private Journaling App

A private, single-user daily journal. **Django + DRF + SimpleJWT** backend, a
**React + Axios** SPA frontend (`frontend/`), and **PostgreSQL** for storage.

## What it does

- **One entry per day** — title, body, journal date, and audit timestamps;
  editable and saved to Postgres.
- **Trackers** — seeded defaults (worked out, mood, diet) plus user-defined custom
  fields of several types (text, integer, float, boolean, option).
- **Attachments** — images now (compressed on upload), video and documents later.
- **Powerful search** — wildcard syntax over title and body (`*this*` contains,
  `this*` prefix, bare word, phrase), with date-range filters and sort.
- **Dashboard** — entry counts, last entry, and a month calendar with a per-day
  mood spectrum (0.00 red → 10.00 green).

## Stack

- **Python 3.14**, **Django 5.2 LTS**, **Django REST Framework**, **psycopg 3**
- **PostgreSQL** (search uses `pg_trgm` + full-text; not optional)
- **Celery + Redis** for async media compression
- **React + Axios** SPA in `frontend/`
- **drf-spectacular** OpenAPI schema + docs
- Settings split: `config/settings/{base,development,production,test}.py`,
  selected by `DJANGO_SETTINGS_MODULE`

## Authentication & tokens

- Django-owned auth; **SimpleJWT** is the single API token system.
- **Refresh token** in an **HttpOnly, Secure, `SameSite=Strict` cookie**
  (dj-rest-auth cookie mode). **Access token** is returned in the response body
  and held **only in JS memory**, sent as `Authorization: Bearer`. There is **no
  access-token cookie**.
- The Axios interceptor performs silent refresh against the cookie; access ~5 min,
  refresh rotation + blacklist on. Because the API is stateless JWT-only (no
  `SessionAuthentication`) and the refresh cookie is used only by the refresh/logout
  endpoints, CSRF exposure is limited to those endpoints, with `SameSite=Strict` as
  the primary protection for the refresh cookie.
- **Single-user / manually-provisioned accounts.** Public registration is
  **disabled in production**; accounts are created via `createsuperuser` or a
  management command. Mandatory MFA (TOTP/passkey) is added in the hardening phase.

## Quick start (local, no Docker)

The virtualenv and dependencies are already set up. You need a reachable Postgres.

```powershell
Copy-Item .env.example .env          # then edit values (DATABASE_URL, SECRET_KEY, ...)
python manage.py migrate
python manage.py createsuperuser     # the single account
python manage.py runserver
```

Frontend (in a second terminal):

```powershell
cd frontend; npm install; npm run dev
```

`manage.py` defaults `DJANGO_SETTINGS_MODULE` to `config.settings.development`.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
docker compose run --rm web python manage.py createsuperuser
```

Brings up `db` (Postgres 16), `redis` (7), `web` (gunicorn), and a Celery
`worker`. The web container waits for the DB, migrates, and collects static.

## Tests & quality

> **Tests run on PostgreSQL, not SQLite.** Search relies on Postgres-only
> features (`pg_trgm`, full-text search, GIN indexes), so `pytest` needs a
> reachable Postgres — running on SQLite would prove nothing. Use the compose
> `db` service or a local instance.

```powershell
python -m pytest                 # full suite (needs Postgres)
python -m pytest -k journal      # subset
python -m pytest --cov           # coverage

python -m ruff check .           # lint
python -m ruff format .          # format
```

Development is **test-driven**: the failing test is written before the code, and
`pytest` is green before a phase is considered done.

## API surface

Versioned under `/api/v1/`.

| Method | Path | Purpose | Status |
|---|---|---|---|
| GET | `/health/` | liveness probe (no auth) | now |
| POST | `/auth/login/` · `/auth/logout/` · `/auth/token/refresh/` | cookie-mode JWT | P0 |
| POST | `/auth/password/reset/` | start password reset | now |
| GET/PATCH | `/users/me/` | current user | now |
| GET/POST | `/entries/` | list / create entries | P1 |
| GET/PUT/PATCH/DELETE | `/entries/{date}/` | a day's entry | P1 |
| GET/POST/PATCH/DELETE | `/trackers/` · `/trackers/{id}/` | manage tracker definitions | P2 |
| PUT | `/entries/{date}/trackers/` | set tracker values for a day | P2 |
| GET | `/search/?q=...&date_from=&date_to=&sort=` | wildcard search + range/sort | P3 |
| GET/POST/DELETE | `/entries/{date}/attachments/` | media per day | P4 |
| GET | `/dashboard/` | counts, last entry, month mood map | P5 |
| GET | `/api/schema/` · `/api/docs/` · `/api/redoc/` | OpenAPI schema · Swagger · Redoc | now |

Authenticate API requests with `Authorization: Bearer <access_token>`; the access
token comes from the login/refresh response body.

## Status & roadmap

- **P0** ✅ — foundations (Postgres test DB, `pg_trgm`, cookie-mode JWT, `frontend/` scaffold, CI)
- **P1** ✅ — core journaling (one entry per day)
- **P2** ✅ — trackers (default + custom typed fields; tracker widgets in editor; manage-trackers page)
- **P3** ✅ — search (wildcard, date range, sort) — *core feature*
- **P4** — attachments (images first, compressed via Celery/Pillow)
- **P5** — frontend experience (Write page, Browse/list page, Entry detail page, nav bar)
- **P6** — dashboard (mood calendar, entry counts, landing page)
- **P7** — security & production hardening (MFA, lockout, throttling, Nginx, encrypted backups + tested restore, monitoring)

## Security note

The body and title are stored as **searchable plaintext inside Postgres** so
wildcard/full-text search works. Confidentiality is enforced at the perimeter —
full-disk/volume encryption, **encrypted off-box backups**, and **strict
no-content logging** (journal content is never written to logs, error responses,
or Sentry). The body is deliberately **not** field-encrypted; doing so would make
it opaque to SQL and break search.

## Layout

```
config/            settings split, root urls, asgi/wsgi, celery
apps/
  core/            shared base models, pagination, health check
  users/           custom user, manager, cookie-mode JWT auth
  journal/         Entry model, entry CRUD, search, dashboard aggregations
  trackers/        Tracker definitions + TrackerValue (EAV)
  attachments/     media upload + async compression
frontend/          React + Axios SPA
tests/             pytest suite (Postgres), mirrors apps/
requirements/      base / development / production
docker/            entrypoint
```
