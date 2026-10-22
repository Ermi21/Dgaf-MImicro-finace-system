# Admin Mini App

The administrator's side: dashboard, registration review/approval,
users, jobs, locations, notifications, reports, activity logs, and admin
management. Opened from the Telegram bot's Admin Menu (each button
deep-links to a `?view=` here - see `src/App.tsx`).

Every action is permission-gated **twice**: the UI hides buttons the
current admin can't use (`IfPermitted` / the nav bar itself), and the
backend independently re-checks the same permission on every request -
the frontend is convenience, not the security boundary (spec section 24).

## Setup

```bash
npm install
cp .env.example .env.local
# VITE_API_BASE_URL must point at your running backend.

npm run dev
npm run build
```

## What's here

- **Dashboard** - summary cards (spec section 10)
- **Registrations** - search/filter/paginate, detail view, approve /
  reject (with required reason) / suspend / resume / reset-to-pending,
  each gated by its own permission (sections 11-13)
- **Users** - read-only search of job seekers
- **Jobs** - create, soft activate/deactivate (never hard-deleted)
- **Locations** - City -> Subcity -> Woreda management with soft
  deactivation
- **Notifications** - send to an individual, everyone, or a filtered
  audience (by job/city/employment type/status), plus send history
- **Reports** - registrations by job and by city
- **Activity Logs** - the append-only audit trail
- **Admin Management** - create/deactivate administrators; edit which
  permissions each role grants (Super Admin only)

## Structure

Same shape as the User Mini App (`components/`, `hooks/`, `i18n/`,
`pages/`, `services/`, `types/`), plus:

- `src/permissions.ts` - permission code constants mirroring the
  backend's `app.permissions.constants.Permissions`
- `src/components/IfPermitted.tsx` - conditionally renders children
  based on the logged-in admin's permission set

## Docker

```bash
docker build --build-arg VITE_API_BASE_URL=https://api.yourdomain.com -t admin-mini-app .
```
