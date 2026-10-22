from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import auth_headers, login


async def _registration_payload(seed, **overrides) -> dict:
    payload = {
        "first_name": "Abebe",
        "second_name": "Kebede",
        "phone": "0911223344",
        "city_id": str(seed["city_a"]),
        "subcity_id": str(seed["subcity_a"]),
        "woreda_id": str(seed["woreda_a"]),
        "job_id": str(seed["job_active"]),
        "employment_type": "EMPLOYEE",
    }
    payload.update(overrides)
    return payload


async def test_create_registration_success(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    response = await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(seed),
        headers=auth_headers(auth["access_token"]),
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["job"]["name"] == "Driver"
    assert body["user"]["phone"] == "+251911223344"  # normalized


async def test_duplicate_registration_same_job_rejected(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    headers = auth_headers(auth["access_token"])
    payload = await _registration_payload(seed)

    first = await client.post("/api/v1/registrations", json=payload, headers=headers)
    assert first.status_code == 201

    second = await client.post("/api/v1/registrations", json=payload, headers=headers)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "duplicate_registration"


async def test_registration_for_different_job_allowed(client: AsyncClient, seed, session_factory):
    from app.models.job import Job

    async with session_factory() as session:
        second_job = Job(name="Cleaner")
        session.add(second_job)
        await session.commit()
        second_job_id = second_job.id

    auth = await login(client, seed["job_seeker_telegram_id"])
    headers = auth_headers(auth["access_token"])

    first = await client.post(
        "/api/v1/registrations", json=await _registration_payload(seed), headers=headers
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(seed, job_id=str(second_job_id)),
        headers=headers,
    )
    assert second.status_code == 201


async def test_inactive_job_rejected(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    response = await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(seed, job_id=str(seed["job_inactive"])),
        headers=auth_headers(auth["access_token"]),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "inactive_resource"


async def test_mismatched_location_hierarchy_rejected(client: AsyncClient, seed):
    """subcity_a belongs to city_a, NOT city_b - must be rejected even
    though subcity_a and city_b both individually exist and are active."""
    auth = await login(client, seed["job_seeker_telegram_id"])
    response = await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(
            seed, city_id=str(seed["city_b"]), subcity_id=str(seed["subcity_a"])
        ),
        headers=auth_headers(auth["access_token"]),
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_location_hierarchy"


async def test_invalid_phone_number_rejected(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    response = await client.post(
        "/api/v1/registrations",
        json=await _registration_payload(seed, phone="12345"),
        headers=auth_headers(auth["access_token"]),
    )
    assert response.status_code == 422


async def test_list_own_registrations(client: AsyncClient, seed):
    auth = await login(client, seed["job_seeker_telegram_id"])
    headers = auth_headers(auth["access_token"])
    await client.post(
        "/api/v1/registrations", json=await _registration_payload(seed), headers=headers
    )

    response = await client.get("/api/v1/registrations/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["job_name"] == "Driver"


async def test_cannot_view_another_users_registration(client: AsyncClient, seed):
    auth1 = await login(client, seed["job_seeker_telegram_id"])
    headers1 = auth_headers(auth1["access_token"])
    created = await client.post(
        "/api/v1/registrations", json=await _registration_payload(seed), headers=headers1
    )
    registration_id = created.json()["id"]

    auth2 = await login(client, seed["job_seeker_telegram_id"] + 1)
    headers2 = auth_headers(auth2["access_token"])
    response = await client.get(f"/api/v1/registrations/{registration_id}", headers=headers2)
    assert response.status_code == 403
