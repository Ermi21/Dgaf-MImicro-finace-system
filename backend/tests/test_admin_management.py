from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, login


async def test_super_admin_can_create_admin(client: AsyncClient, seed):
    super_auth = await login(client, seed["super_admin_telegram_id"])
    headers = auth_headers(super_auth["access_token"])

    roles = await client.get("/api/v1/admin-management/roles", headers=headers)
    assert roles.status_code == 200
    viewer_role_id = next(r["id"] for r in roles.json() if r["name"] == "VIEWER")

    created = await client.post(
        "/api/v1/admin-management/admins",
        json={"telegram_id": 9999, "name": "New Viewer", "role_id": viewer_role_id},
        headers=headers,
    )
    assert created.status_code == 201
    assert created.json()["role_name"] == "VIEWER"


async def test_regular_admin_cannot_manage_admins(client: AsyncClient, seed):
    admin_auth = await login(client, seed["admin_telegram_id"])
    headers = auth_headers(admin_auth["access_token"])
    response = await client.get("/api/v1/admin-management/admins", headers=headers)
    assert response.status_code == 403


async def test_permission_change_takes_effect_without_relogin(client: AsyncClient, seed):
    """Regression guard for the auth design: permissions are re-read from
    the DB on every request (see app.api.v1.deps.get_current_actor), NOT
    baked into the session JWT - so revoking a permission should apply
    to a token that was already issued, without needing to log in again."""
    super_auth = await login(client, seed["super_admin_telegram_id"])
    super_headers = auth_headers(super_auth["access_token"])
    admin_auth = await login(client, seed["admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    roles = await client.get("/api/v1/admin-management/roles", headers=super_headers)
    admin_role = next(r for r in roles.json() if r["name"] == "ADMIN")
    assert "registration.approve" in admin_role["permissions"]

    # Revoke registration.approve from the ADMIN role.
    new_permissions = [p for p in admin_role["permissions"] if p != "registration.approve"]
    update = await client.put(
        f"/api/v1/admin-management/roles/{admin_role['id']}/permissions",
        json={"permission_codes": new_permissions},
        headers=super_headers,
    )
    assert update.status_code == 200

    # The ALREADY-ISSUED admin token should now be denied, with no re-login.
    from tests.test_registrations import _registration_payload

    user_auth = await login(client, seed["job_seeker_telegram_id"])
    reg = await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(seed),
        headers=auth_headers(user_auth["access_token"]),
    )
    reg_id = reg.json()["id"]

    approve = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=admin_headers)
    assert approve.status_code == 403
