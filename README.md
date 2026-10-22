# Job Seeker Registration and Employment Management Platform

A Telegram-based platform where job seekers register through a Mini App
and administrators manage registrations, jobs, locations, and
notifications through a second, permission-gated Mini App - all backed
by one FastAPI service and Supabase Postgres.

```
ONE TELEGRAM BOT
        |
        +-- USER MINI APP    (register, profile, my registration, notifications)
        |
        +-- ADMIN MINI APP   (dashboard, registrations, jobs, locations,
                               notifications, reports, activity logs, admin mgmt)
                |
                v
            FASTAPI  ---->  SUPABASE POSTGRES
```

## Status: all five components built

| Component | What it is | Tests |
|---|---|---|
| `backend/` | FastAPI + SQLAlchemy + Alembic - the source of truth for every business rule | 33 passing |
| `telegram-bot/` | aiogram bot - thin menu/routing layer, no business logic | 5 passing |
| `user-mini-app/` | React/TS/Vite - registration form, profile, status, notifications | builds clean |
| `admin-mini-app/` | React/TS/Vite - dashboard, registration review, admin management | builds clean |
| `nginx/` | Reverse proxy configs for all three public-facing services | validated |

Each directory has its own README with real setup steps. **Start with
`backend/README.md`** - the bot and both Mini Apps all depend on the
backend being configured first (your Supabase connection string and
Telegram bot token).

## Getting the whole thing running

1. **Backend** - `backend/README.md`: fill in `.env`, run migrations,
   bootstrap your first Super Admin.
2. **Telegram bot** - `telegram-bot/README.md`: fill in `.env` (same bot
   token + a shared `BOT_SERVICE_TOKEN` with the backend), run it.
3. **Mini Apps** - `user-mini-app/README.md` and
   `admin-mini-app/README.md`: fill in `.env.local` with the backend's
   URL, `npm install && npm run build`. These need to be served over
   **HTTPS** somewhere Telegram can reach - see `nginx/README.md` for
   the reverse-proxy + TLS setup, or use a tunnel (ngrok/cloudflared) for
   local testing.
4. Set each Mini App's public HTTPS URL in the bot's `.env` so its menu
   buttons open the right place.

Or, once every `.env` is filled in:

```bash
docker compose up --build
```

## Design decisions worth knowing about

- **The backend is the only source of truth for business rules.** The
  bot and both Mini Apps only render UI and call the API - see
  `backend/README.md` for the full list of enforced rules (duplicate
  registration prevention, location hierarchy validation, the
  approve/reject/suspend/resume state machine, etc).
- **Two separate auth mechanisms, each fit for its context:** Mini Apps
  authenticate via Telegram's `initData` HMAC signature (verified
  against the bot token); the bot process authenticates its own
  backend calls via a shared secret (`BOT_SERVICE_TOKEN`), since a
  `telegram_id` the bot has is already provably genuine (it only comes
  from real Telegram Bot API updates).
- **Permissions are re-checked from the database on every request**,
  not baked into a session token - so a Super Admin revoking a
  permission takes effect immediately, without anyone needing to log in
  again (there's a regression test for exactly this in
  `backend/tests/test_admin_management.py`).
- **Soft deactivation everywhere it matters:** jobs and locations are
  never hard-deleted, since historical registrations reference them.

## Repository layout

```
job-platform/
├── backend/            FastAPI, SQLAlchemy models, Alembic migrations, tests
├── telegram-bot/       aiogram bot
├── user-mini-app/      React/TS/Vite - job seeker Mini App
├── admin-mini-app/     React/TS/Vite - administrator Mini App
├── nginx/              reverse proxy configs + TLS setup notes
├── docker-compose.yml  wires all five services together
└── .gitignore
```
