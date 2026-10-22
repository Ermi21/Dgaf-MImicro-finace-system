from __future__ import annotations

import os

from httpx import AsyncClient

from tests.conftest import auth_headers, login
from tests.test_registrations import _registration_payload


async def test_profile_404_before_first_registration(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    response = await client.get("/api/v1/users/me", headers=auth_headers(auth["access_token"]))
    assert response.status_code == 404


async def test_profile_visible_and_language_updatable_after_registration(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    headers = auth_headers(auth["access_token"])
    await client.post(
        "/api/v1/registrations", json=await _registration_payload(seed), headers=headers
    )

    profile = await client.get("/api/v1/users/me", headers=headers)
    assert profile.status_code == 200
    assert profile.json()["language"] == "en"

    updated = await client.patch("/api/v1/users/me", json={"language": "am"}, headers=headers)
    assert updated.status_code == 200
    assert updated.json()["language"] == "am"


async def test_bot_internal_requires_shared_secret(client: AsyncClient, seed):
    no_token = await client.get(f"/api/v1/bot/actor-status/{seed['admin_telegram_id']}")
    assert no_token.status_code == 401

    wrong_token = await client.get(
        f"/api/v1/bot/actor-status/{seed['admin_telegram_id']}",
        headers={"X-Bot-Service-Token": "wrong"},
    )
    assert wrong_token.status_code == 401


async def test_bot_internal_resolves_admin_and_user(client: AsyncClient, seed):
    token = os.environ["BOT_SERVICE_TOKEN"]
    headers = {"X-Bot-Service-Token": token}

    admin_status = await client.get(
        f"/api/v1/bot/actor-status/{seed['admin_telegram_id']}", headers=headers
    )
    assert admin_status.status_code == 200
    body = admin_status.json()
    assert body["is_admin"] is True
    assert body["role_name"] == "ADMIN"

    user_status = await client.get(
        f"/api/v1/bot/actor-status/{seed['job_seeker_telegram_id']}", headers=headers
    )
    assert user_status.status_code == 200
    assert user_status.json()["is_admin"] is False


async def test_admin_can_search_users(client: AsyncClient, seed):
    user_auth = await login(client, seed["job_seeker_telegram_id"])
    await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(seed),
        headers=auth_headers(user_auth["access_token"]),
    )

    admin_auth = await login(client, seed["admin_telegram_id"])
    response = await client.get(
        "/api/v1/users", params={"q": "Abebe"}, headers=auth_headers(admin_auth["access_token"])
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(u["first_name"] == "Abebe" for u in body["items"])


async def test_viewer_cannot_send_notifications(client: AsyncClient, seed):
    viewer_auth = await login(client, seed["viewer_telegram_id"])
    response = await client.post(
        "/api/v1/notifications",
        json={"audience_type": "ALL_USERS", "message": "hello"},
        headers=auth_headers(viewer_auth["access_token"]),
    )
    assert response.status_code == 403
