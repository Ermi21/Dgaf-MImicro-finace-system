# Telegram Bot

Thin presentation layer for one Telegram Bot shared by both Mini Apps.
No business logic lives here - every menu shown is decided by asking the
backend `GET /api/v1/bot/actor-status/{telegram_id}` who the sender is.

## What it does

- `/start` - resolves the sender's role via the backend and shows the
  Normal User Menu or Admin Menu (spec section 5)
- Every menu button except **Help** and **Language** is a Telegram
  `web_app` button that opens the User or Admin Mini App directly at a
  specific view (`?view=register`, `?view=dashboard`, etc.) - Telegram
  handles this client-side, so the bot process isn't involved at all
  once the button is tapped
- **Help** - shows role-appropriate help text
- **Language** - lets a job seeker switch English/Amharic; persisted to
  the backend if they already have a profile, kept as a lightweight
  in-memory override otherwise (see `app/services/language_store.py`)
- `/whoami` - admin utility to check your own role/active status

## Setup

```bash
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN (same bot as the backend's env),
# BOT_SERVICE_TOKEN (must match the backend's BOT_SERVICE_TOKEN exactly),
# BACKEND_API_BASE_URL, and the two Mini App HTTPS URLs.

pip install -e ".[dev]"
python -m app.bot
```

This runs in long-polling mode, which is the simplest way to run it
behind a firewall/NAT with no public HTTPS endpoint of its own. For
production, either keep polling (fine at this scale) or switch to
`bot.set_webhook(...)` + an aiohttp/FastAPI receiver if you need it -
polling is intentionally kept here to avoid needing yet another public
HTTPS endpoint just for the bot.

## Tests

```bash
pytest
```

Covers i18n fallback behavior, that each menu button's Mini App URL is
built correctly, and that the backend client sends the shared-secret
header (mocked HTTP, no real backend needed).
