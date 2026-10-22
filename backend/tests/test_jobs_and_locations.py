from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, login


async def test_create_and_deactivate_job(client: AsyncClient, seed):
    admin_auth = await login(client, seed["admin_telegram_id"])
    super_auth = await login(client, seed["super_admin_telegram_id"])

    # ADMIN role's default permission set doesn't include job.create.
    denied = await client.post(
        "/api/v1/jobs",
        json={"name": "Electrician", "description": "Wiring work"},
        headers=auth_headers(admin_auth["access_token"]),
    )
    assert denied.status_code == 403

    created = await client.post(
        "/api/v1/jobs",
        json={"name": "Electrician", "description": "Wiring work"},
        headers=auth_headers(super_auth["access_token"]),
    )
    assert created.status_code == 201
    job_id = created.json()["id"]

    deactivated = await client.post(
        f"/api/v1/jobs/{job_id}/deactivate", headers=auth_headers(super_auth["access_token"])
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    active_list = await client.get(
        "/api/v1/jobs/active", headers=auth_headers(admin_auth["access_token"])
    )
    assert all(j["id"] != job_id for j in active_list.json())


async def test_location_hierarchy_endpoints(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    headers = auth_headers(auth["access_token"])

    cities = await client.get("/api/v1/cities", headers=headers)
    assert cities.status_code == 200
    assert any(c["id"] == str(seed["city_a"]) for c in cities.json())

    subcities = await client.get(f"/api/v1/cities/{seed['city_a']}/subcities", headers=headers)
    assert subcities.status_code == 200
    assert all(s["city_id"] == str(seed["city_a"]) for s in subcities.json())

    woredas = await client.get(f"/api/v1/subcities/{seed['subcity_a']}/woredas", headers=headers)
    assert woredas.status_code == 200
    assert all(w["subcity_id"] == str(seed["subcity_a"]) for w in woredas.json())
