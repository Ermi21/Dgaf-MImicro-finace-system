"""Shared test fixtures.

Uses an in-memory SQLite DB (via aiosqlite) rather than a real Postgres/
Supabase instance, so the test suite runs anywhere with zero external
dependencies. All DB-agnostic SQLAlchemy features are used in the models
(generic JSON/Enum types, etc.) specifically so this works; only the
`gen_random_uuid()` server-side default from the hand-written Alembic
migration is Postgres-only, and that's bypassed here since tables are
created straight from the ORM metadata instead of via Alembic.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import uuid
from collections.abc import AsyncGenerator

# IMPORTANT: set env vars BEFORE importing any app module, since
# app.core.config.get_settings() is an lru_cache'd singleton read once.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test-bot-token")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-ci-only")
os.environ.setdefault("BOT_SERVICE_TOKEN", "test-bot-service-token")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import get_db
from app.models import *  # noqa: F401,F403 - ensures all tables register
from app.models.admin import Admin
from app.models.job import Job
from app.models.location import City, Subcity, Woreda
from app.models.role import Permission, Role, RolePermission
from app.permissions.constants import DEFAULT_ROLE_PERMISSIONS, Permissions

TEST_BOT_TOKEN = "test-bot-token"


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session_factory(engine):
    return async_sessionmaker(bind=engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def seed(session_factory) -> AsyncGenerator[dict, None]:
    """Seeds roles/permissions (mirroring the real seed migration), two
    cities each with one subcity/woreda, one active + one inactive job,
    and three admins (one per role). Yields a dict of IDs/telegram_ids
    tests can reference."""
    async with session_factory() as session:
        role_objs: dict[str, Role] = {}
        for role_name in DEFAULT_ROLE_PERMISSIONS:
            role = Role(name=role_name)
            session.add(role)
            role_objs[role_name] = role
        await session.flush()

        permission_objs: dict[str, Permission] = {}
        for code in Permissions.all():
            perm = Permission(code=code)
            session.add(perm)
            permission_objs[code] = perm
        await session.flush()

        for role_name, codes in DEFAULT_ROLE_PERMISSIONS.items():
            for code in codes:
                session.add(
                    RolePermission(
                        role_id=role_objs[role_name].id, permission_id=permission_objs[code].id
                    )
                )

        city_a = City(name="Addis Ababa")
        city_b = City(name="Adama")
        session.add_all([city_a, city_b])
        await session.flush()

        subcity_a = Subcity(name="Bole", city_id=city_a.id)
        subcity_b = Subcity(name="Kebele01", city_id=city_b.id)
        session.add_all([subcity_a, subcity_b])
        await session.flush()

        woreda_a = Woreda(name="Woreda03", subcity_id=subcity_a.id)
        woreda_b = Woreda(name="Woreda01", subcity_id=subcity_b.id)
        session.add_all([woreda_a, woreda_b])
        await session.flush()

        job_active = Job(name="Driver")
        job_inactive = Job(name="Retired Role", is_active=False)
        session.add_all([job_active, job_inactive])
        await session.flush()

        admin_super = Admin(
            telegram_id=1001, name="Alice SuperAdmin", role_id=role_objs["SUPER_ADMIN"].id
        )
        admin_regular = Admin(telegram_id=1002, name="Bob Admin", role_id=role_objs["ADMIN"].id)
        admin_viewer = Admin(telegram_id=1003, name="Carol Viewer", role_id=role_objs["VIEWER"].id)
        session.add_all([admin_super, admin_regular, admin_viewer])

        await session.commit()

        yield {
            "city_a": city_a.id,
            "city_b": city_b.id,
            "subcity_a": subcity_a.id,
            "subcity_b": subcity_b.id,
            "woreda_a": woreda_a.id,
            "woreda_b": woreda_b.id,
            "job_active": job_active.id,
            "job_inactive": job_inactive.id,
            "super_admin_telegram_id": 1001,
            "admin_telegram_id": 1002,
            "viewer_telegram_id": 1003,
            "job_seeker_telegram_id": 2001,
        }


@pytest_asyncio.fixture
async def client(session_factory, seed) -> AsyncGenerator[AsyncClient, None]:
    from app.main import app

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


def build_init_data(
    telegram_id: int,
    *,
    first_name: str = "Test",
    last_name: str = "User",
    auth_date: int | None = None,
) -> str:
    """Builds a validly-signed Telegram WebApp `initData` string, exactly
    as Telegram itself would, so tests exercise the real HMAC verification
    path in app.core.security rather than mocking it away.

    `auth_date` can be overridden (e.g. to simulate an old/replayed
    payload) without touching the global `time.time()` - patching that
    globally would also skew the server's own "what time is it now"
    reference used for the expiry check, canceling the test out."""
    user_payload = {
        "id": telegram_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": f"user{telegram_id}",
        "language_code": "en",
    }
    data = {
        "auth_date": str(auth_date if auth_date is not None else int(time.time())),
        "query_id": "AAA" + uuid.uuid4().hex[:8],
        "user": json.dumps(user_payload, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", TEST_BOT_TOKEN.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    data["hash"] = computed_hash

    from urllib.parse import urlencode

    return urlencode(data)


async def login(client: AsyncClient, telegram_id: int, **kwargs) -> dict:
    init_data = build_init_data(telegram_id, **kwargs)
    response = await client.post("/api/v1/auth/telegram-login", json={"init_data": init_data})
    assert response.status_code == 200, response.text
    return response.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
