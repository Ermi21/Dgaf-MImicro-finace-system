# User Mini App

The job seeker's side: register for a job, check registration status,
view profile, view notification history. Opened from the Telegram bot's
menu (each button deep-links to a `?view=` here - see `src/App.tsx`).

No business logic lives here - every rule (duplicate registration,
location hierarchy, active-job checks, etc.) is enforced by the backend;
this app just calls the API and renders loading/error/success states.

## Setup

```bash
npm install
cp .env.example .env.local
# VITE_API_BASE_URL must point at your running backend, and that
# backend's CORS_ALLOWED_ORIGINS must include wherever this ends up
# served from.

npm run dev       # local dev server
npm run build      # type-checks (tsc -b) then builds to dist/
```

## Telegram integration

- `src/services/telegram.ts` wraps the whole `window.Telegram.WebApp`
  API in one place (init data, theme, MainButton/BackButton, haptics) -
  every other module goes through it instead of touching the global
  directly, and it degrades gracefully when opened in a plain browser
  during development.
- Auth: on load, sends `window.Telegram.WebApp.initData` to
  `POST /api/v1/auth/telegram-login`; the returned session token is kept
  in memory (never localStorage) and attached to every subsequent request.
- Theming: adopts the user's actual Telegram theme colors
  (`--tg-bg`, `--tg-text`, etc.) as CSS variables, with a signature deep
  teal-green accent (`--color-primary`) for primary actions and status,
  rather than a generic default palette.

## Structure

```
src/
  components/   Button, TextField, SelectField, loading/error/empty states
  hooks/        useAuth (Telegram login), useApi (fetch + loading/error state)
  i18n/         English + Amharic dictionaries
  pages/        HomePage, RegisterPage, ProfilePage, MyRegistrationsPage, NotificationsPage
  services/     api.ts (backend client), telegram.ts (WebApp SDK wrapper)
  types/        shared TS types matching the backend's Pydantic schemas
```

## Docker

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com -t user-mini-app .
```

Builds the static app and serves it via nginx (see the root
`docker-compose.yml`).
