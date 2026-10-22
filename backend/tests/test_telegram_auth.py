from __future__ import annotations

import time

from httpx import AsyncClient

from tests.conftest import build_init_data, login


async def test_valid_init_data_issues_token(client: AsyncClient, seed):
    result = await login(client, seed["job_seeker_telegram_id"])
    assert result["access_token"]
    assert result["is_admin"] is False
    assert result["role"] is None


async def test_admin_login_returns_role_and_permissions(client: AsyncClient, seed):
    result = await login(client, seed["admin_telegram_id"])
    assert result["is_admin"] is True
    assert result["role"] == "ADMIN"
    assert "registration.approve" in result["permissions"]
    assert "admin.manage" not in result["permissions"]  # ADMIN, not SUPER_ADMIN


async def test_tampered_hash_is_rejected(client: AsyncClient, seed):
    init_data = build_init_data(seed["job_seeker_telegram_id"])
    tampered = init_data[:-4] + "beef"  # corrupt the trailing hash chars
    response = await client.post("/api/v1/auth/telegram-login", json={"init_data": tampered})
    assert response.status_code == 401


async def test_missing_init_data_rejected(client: AsyncClient, seed):
    response = await client.post("/api/v1/auth/telegram-login", json={"init_data": ""})
    assert response.status_code == 401


async def test_expired_auth_date_is_rejected(client: AsyncClient, seed):
    two_days_ago = int(time.time()) - 2 * 86400
    init_data = build_init_data(seed["job_seeker_telegram_id"], auth_date=two_days_ago)

    response = await client.post("/api/v1/auth/telegram-login", json={"init_data": init_data})
    assert response.status_code == 401
