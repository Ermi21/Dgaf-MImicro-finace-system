from __future__ import annotations

import os

os.environ.setdefault("TELEGRAM_BOT_TOKEN", "123:test")
os.environ.setdefault("BOT_SERVICE_TOKEN", "test-token")
os.environ.setdefault("BACKEND_API_BASE_URL", "http://backend.test")
os.environ.setdefault("USER_MINI_APP_URL", "https://user.example.com")
os.environ.setdefault("ADMIN_MINI_APP_URL", "https://admin.example.com")

import httpx
import pytest

from app.config import Settings
from app.i18n import t
from app.keyboards.menus import admin_menu, user_menu
from app.services.backend_client import BackendClient


def test_translation_falls_back_to_english_for_unknown_language():
    assert t("menu_help", "fr") == t("menu_help", "en")


def test_translation_formats_placeholders():
    result = t("welcome_admin", "en", name="Alice", role="ADMIN")
    assert "Alice" in result and "ADMIN" in result


def test_user_menu_buttons_point_at_user_mini_app():
    kb = user_menu("en", "https://user.example.com")
    urls = [btn.web_app.url for row in kb.keyboard for btn in row if btn.web_app is not None]
    assert all(url.startswith("https://user.example.com?view=") for url in urls)
    assert any("view=register" in url for url in urls)


def test_admin_menu_buttons_point_at_admin_mini_app():
    kb = admin_menu("en", "https://admin.example.com")
    urls = [btn.web_app.url for row in kb.keyboard for btn in row if btn.web_app is not None]
    assert all(url.startswith("https://admin.example.com?view=") for url in urls)
    assert any("view=dashboard" in url for url in urls)


@pytest.mark.asyncio
async def test_backend_client_sends_shared_secret_header(monkeypatch):
    captured = {}

    async def fake_get(self, url, headers=None, **kwargs):
        captured["url"] = url
        captured["headers"] = headers
        request = httpx.Request("GET", url)
        return httpx.Response(
            200,
            json={
                "telegram_id": 42,
                "is_admin": True,
                "role_name": "ADMIN",
                "is_active": True,
                "language": "en",
            },
            request=request,
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    settings = Settings(
        telegram_bot_token="123:test",
        bot_service_token="secret-token",
        backend_api_base_url="http://backend.test",
        user_mini_app_url="https://user.example.com",
        admin_mini_app_url="https://admin.example.com",
    )
    client = BackendClient(settings)
    status = await client.get_actor_status(42)

    assert status.is_admin is True
    assert status.role_name == "ADMIN"
    assert captured["headers"]["X-Bot-Service-Token"] == "secret-token"
    assert "42" in captured["url"]
