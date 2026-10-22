from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, login
from tests.test_registrations import _registration_payload


async def _create_pending_registration(client: AsyncClient, seed) -> tuple[str, dict]:
    user_auth = await login(client, seed["job_seeker_telegram_id"])
    user_headers = auth_headers(user_auth["access_token"])
    created = await client.post(
        "/api/v1/registrations", json=await _registration_payload(seed), headers=user_headers
    )
    assert created.status_code == 201
    return created.json()["id"], user_headers


async def test_approve_pending_registration(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    admin_auth = await login(client, seed["admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    response = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=admin_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "APPROVED"
    assert body["approved_at"] is not None


async def test_cannot_approve_twice(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    admin_auth = await login(client, seed["admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    first = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=admin_headers)
    assert first.status_code == 200

    second = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=admin_headers)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "invalid_status_transition"


async def test_reject_requires_reason(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    admin_auth = await login(client, seed["admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    missing_reason = await client.post(
        f"/api/v1/registrations/{reg_id}/reject", json={"reason": ""}, headers=admin_headers
    )
    assert missing_reason.status_code == 422

    with_reason = await client.post(
        f"/api/v1/registrations/{reg_id}/reject",
        json={"reason": "Missing required documents"},
        headers=admin_headers,
    )
    assert with_reason.status_code == 200
    body = with_reason.json()
    assert body["status"] == "REJECTED"
    assert body["rejection_reason"] == "Missing required documents"


async def test_regular_admin_lacks_suspend_by_default(client: AsyncClient, seed):
    """Per spec section 3: an Admin can 'Suspend registrations if
    authorized' - unlike approve/reject, this is NOT part of the ADMIN
    role's default permission set (see DEFAULT_ROLE_PERMISSIONS); a Super
    Admin has to grant `registration.suspend` explicitly."""
    reg_id, _ = await _create_pending_registration(client, seed)
    admin_auth = await login(client, seed["admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    approve = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=admin_headers)
    assert approve.status_code == 200

    suspend = await client.post(f"/api/v1/registrations/{reg_id}/suspend", headers=admin_headers)
    assert suspend.status_code == 403


async def test_full_lifecycle_suspend_and_resume(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    # Suspend/resume require registration.suspend / registration.approve -
    # the Super Admin role holds every permission, so use it here to test
    # the state machine itself rather than the permission-grant nuance
    # (covered separately by test_regular_admin_lacks_suspend_by_default).
    admin_auth = await login(client, seed["super_admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    approve = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=admin_headers)
    assert approve.status_code == 200

    suspend = await client.post(f"/api/v1/registrations/{reg_id}/suspend", headers=admin_headers)
    assert suspend.status_code == 200
    assert suspend.json()["status"] == "SUSPENDED"

    # Can't reject a suspended registration - not in the allowed transition table.
    invalid_reject = await client.post(
        f"/api/v1/registrations/{reg_id}/reject",
        json={"reason": "test"},
        headers=admin_headers,
    )
    assert invalid_reject.status_code == 409

    resume = await client.post(f"/api/v1/registrations/{reg_id}/resume", headers=admin_headers)
    assert resume.status_code == 200
    assert resume.json()["status"] == "APPROVED"


async def test_reset_rejected_to_pending(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    admin_auth = await login(client, seed["admin_telegram_id"])
    admin_headers = auth_headers(admin_auth["access_token"])

    reject = await client.post(
        f"/api/v1/registrations/{reg_id}/reject",
        json={"reason": "incomplete"},
        headers=admin_headers,
    )
    assert reject.status_code == 200

    reset = await client.post(
        f"/api/v1/registrations/{reg_id}/reset-to-pending", headers=admin_headers
    )
    assert reset.status_code == 200
    assert reset.json()["status"] == "PENDING"
    assert reset.json()["rejection_reason"] is None


async def test_viewer_cannot_approve(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    viewer_auth = await login(client, seed["viewer_telegram_id"])
    viewer_headers = auth_headers(viewer_auth["access_token"])

    response = await client.post(f"/api/v1/registrations/{reg_id}/approve", headers=viewer_headers)
    assert response.status_code == 403


async def test_viewer_can_view_registrations(client: AsyncClient, seed):
    reg_id, _ = await _create_pending_registration(client, seed)
    viewer_auth = await login(client, seed["viewer_telegram_id"])
    viewer_headers = auth_headers(viewer_auth["access_token"])

    response = await client.get("/api/v1/registrations", headers=viewer_headers)
    assert response.status_code == 200
    assert response.json()["total"] >= 1


async def test_job_seeker_cannot_list_all_registrations(client: AsyncClient, seed):
    _, user_headers = await _create_pending_registration(client, seed)
    response = await client.get("/api/v1/registrations", headers=user_headers)
    assert response.status_code == 403
