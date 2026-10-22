# Backend - Job Seeker Registration and Employment Management Platform

Phase 1 deliverable: the backend foundation (database models, repositories,
services, and the full REST API). The Telegram bot and the two Mini App
frontends are separate phases that will call these same APIs.

## Architecture

```
Telegram Mini App (or bot)
        |
FastAPI route  (app/api/v1/*)          <- thin, no business logic
        |
Pydantic schema validation  (app/schemas/*)
        |
Service  (app/services/*)              <- all business rules live here
        |
Repository  (app/repositories/*)
        |
SQLAlchemy models  (app/models/*)  ->  Supabase Postgres
```

Nothing about "who can do what" is decided by the frontend. Every
protected endpoint re-derives the caller's admin/role/permissions from
the database on every request (see `app/api/v1/deps.py`).

## 1. Prerequisites

- Python 3.12+
- A Supabase project (you said you already have one) - you need its
  Postgres connection string (Project Settings -> Database -> Connection
  string -> URI, "Session pooler" or direct connection both work)
- Your Telegram Bot token (from @BotFather)

## 2. Local setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

cp .env.example .env
# Now edit .env and fill in:
#   DATABASE_URL      - postgresql+asyncpg://... pointing at your Supabase project
#   TELEGRAM_BOT_TOKEN - your real bot token from BotFather
#   JWT_SECRET         - generate one, e.g.: python -c "import secrets; print(secrets.token_urlsafe(48))"
#   CORS_ALLOWED_ORIGINS - your Mini App domain(s), once deployed
#
# NEVER commit .env or paste these values anywhere outside your own machine/host.
```

## 3. Run migrations against your real Supabase database

```bash
alembic upgrade head
```

This creates all 14 tables and seeds the three roles (`SUPER_ADMIN`,
`ADMIN`, `VIEWER`) with their default permission sets.

## 4. Bootstrap your first Super Admin

Creating an admin normally requires the `admin.manage` permission - which
only an existing admin has. Run this once to break that chicken-and-egg
loop, using **your own** Telegram numeric user ID (get it from
[@userinfobot](https://t.me/userinfobot) or similar):

```bash
SUPER_ADMIN_TELEGRAM_ID=123456789 SUPER_ADMIN_NAME="Your Name" \
    python -m scripts.bootstrap_super_admin
```

From then on, use `/api/v1/admin-management/admins` (as this Super Admin)
to create every other administrator.

## 5. Run the API

```bash
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for interactive API docs (disabled
automatically when `ENVIRONMENT=production`).

## 6. Run the tests

```bash
pytest
```

The test suite (27 tests) runs against an in-memory SQLite database and
needs no external services - it covers the registration business rules
(duplicate detection, location hierarchy validation, phone normalization),
the full status state machine (approve/reject/suspend/resume), and
permission enforcement, including a regression test proving a permission
revoked by a Super Admin takes effect immediately on already-issued
sessions.

## 7. Docker

```bash
docker compose up --build
```

(`docker-compose.yml` lives at the repo root, one level up.)

## Authentication model

1. The Mini App calls `POST /api/v1/auth/telegram-login` once per session
   with the raw `window.Telegram.WebApp.initData` string.
2. The backend validates its HMAC signature (`app/core/security.py`,
   using your bot token as the signing key) - this is the **only** place
   a Telegram identity claim is trusted.
3. If valid, the backend issues a short-lived internal JWT encoding only
   the verified `telegram_id`.
4. Every other endpoint takes that JWT as `Authorization: Bearer <token>`.
   The admin/role/permission lookup happens fresh from the database on
   every request - so a permission a Super Admin revokes takes effect
   immediately, without anyone needing to log in again.

## What's implemented

- All 14 tables from the spec, with soft-deactivation on jobs/locations
  (never hard-deleted, since historical registrations reference them)
- The 15-step registration creation flow (validation, normalization,
  location-hierarchy checks, active-job check, duplicate-registration
  check, transactional create) - `app/services/registration_service.py`
- The exact status state machine from the spec (PENDING -> APPROVED /
  REJECTED, APPROVED <-> SUSPENDED, REJECTED -> PENDING) with permission
  checks, activity logging, and automatic notifications on every
  transition
- Role/permission-based authorization, editable at runtime by a Super
  Admin (`/api/v1/admin-management/roles/{id}/permissions`)
- Targeted + bulk notifications with audience resolution (by job, city,
  subcity, woreda, employment type, registration status, or all users),
  rate-limited background dispatch, and per-recipient retry/failure
  tracking
- Append-only activity log
- Full pytest suite (27 tests, all passing)

## What's NOT yet built (next phases)

- The Telegram bot itself (`aiogram`) - menus, `/start` handling
- The two Mini App frontends (React/TypeScript/Vite)
- Nginx reverse proxy config / TLS termination
- CI pipeline

Ask for any of these next and they'll be built against this same backend.
