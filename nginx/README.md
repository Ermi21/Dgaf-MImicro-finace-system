# Nginx reverse proxy

Fronts all three public services (backend API, User Mini App, Admin Mini
App) under separate subdomains. Ships HTTP-only by design - see the
comment in `conf.d/api.conf` for obtaining real Let's Encrypt
certificates via certbot before going live. Telegram **requires** HTTPS
for Mini App URLs and bot webhooks, so this step isn't optional for
production.

## Before deploying

1. Point DNS (`api.`, `user.`, `admin.` subdomains) at this server.
2. Replace `yourdomain.com` in every `conf.d/*.conf` file with your real
   domain.
3. Run certbot (see `conf.d/api.conf`) for each subdomain, then add a
   `listen 443 ssl;` server block to each file using the certs it
   generates. Certbot can also do this automatically with the `--nginx`
   plugin if you install it inside this container instead of running it
   standalone.
4. Update `backend/.env`'s `CORS_ALLOWED_ORIGINS` to the real
   `https://user.yourdomain.com,https://admin.yourdomain.com` values, and
   `telegram-bot/.env`'s Mini App URLs to match.
