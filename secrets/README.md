# Centralized Secrets and Environment Configuration

This folder stores environment configuration and sensitive keys for all services in the Job Platform.

> ⚠️ **CRITICAL SECURITY RULE:**
> Real `.env` files (e.g. `backend.env`, `telegram-bot.env`) are strictly **ignored by Git** via `.gitignore`.
> **NEVER** commit real API keys, Bot Tokens, or Database passwords to GitHub.

---

## 📁 Files in this Directory

| Template File | Live Secret File (Git Ignored) | Purpose |
|---|---|---|
| `backend.env.example` | `backend.env` | Database URL, Bot Service Token, JWT Secret, Supabase keys |
| `telegram-bot.env.example` | `telegram-bot.env` | Telegram Bot Token, WebApp URLs, Bot Service Token |
| `admin-mini-app.env.example` | `admin-mini-app.env` | Admin Mini App API Base URL |
| `user-mini-app.env.example` | `user-mini-app.env` | User Mini App API Base URL |

---

## 🚀 Deployment Instructions

When deploying to a production server (Docker Compose, VPS, Railway, Render, etc.):

### Option A: Docker Compose Deployment
1. Copy the `.env.example` templates to `.env` files in this `secrets/` directory on the server:
   - `secrets/backend.env`
   - `secrets/telegram-bot.env`
2. Fill in the production credentials.
3. Start the containers using:
   ```bash
   docker compose up -d --build
   ```

### Option B: Cloud PaaS (Railway, Render, Fly.io, DigitalOcean)
Copy the key-value pairs from `backend.env.example` and `telegram-bot.env.example` directly into your cloud provider's **Environment Variables** dashboard.
