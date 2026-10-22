"""seed default roles and permissions

Revision ID: 0002_seed_roles_permissions
Revises: 0001_initial_schema
Create Date: 2026-07-24
"""
from __future__ import annotations

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "0002_seed_roles_permissions"
down_revision: str | None = "0001_initial_schema"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


# Kept as plain literals (rather than importing app.permissions.constants)
# so this migration's output is stable and independent of future code
# changes - once applied, a Super Admin manages permissions through the
# API/Admin Mini App, not by re-running this file.
_PERMISSION_CODES = [
    "registration.view",
    "registration.approve",
    "registration.reject",
    "registration.suspend",
    "user.view",
    "job.view",
    "job.create",
    "job.update",
    "job.activate",
    "location.view",
    "location.create",
    "location.update",
    "notification.view",
    "notification.send",
    "report.view",
    "dashboard.view",
    "activity_log.view",
    "admin.manage",
    "role.manage",
    "settings.manage",
]

_ROLE_PERMISSIONS = {
    "SUPER_ADMIN": _PERMISSION_CODES,  # everything
    "ADMIN": [
        "registration.view",
        "registration.approve",
        "registration.reject",
        "user.view",
        "job.view",
        "location.view",
        "notification.view",
        "report.view",
        "dashboard.view",
        "activity_log.view",
    ],
    "VIEWER": [
        "registration.view",
        "user.view",
        "job.view",
        "location.view",
        "report.view",
        "dashboard.view",
    ],
}

_ROLE_DESCRIPTIONS = {
    "SUPER_ADMIN": "Full system access: manages admins, roles, permissions, jobs, and locations.",
    "ADMIN": "Manages registrations day-to-day; specific extra permissions are grantable per admin.",
    "VIEWER": "Read-only access to dashboards, registrations, and reports.",
}


def upgrade() -> None:
    conn = op.get_bind()

    roles_table = sa.table(
        "roles",
        sa.column("id", pg.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
    )
    permissions_table = sa.table(
        "permissions",
        sa.column("id", pg.UUID(as_uuid=True)),
        sa.column("code", sa.String),
    )
    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("id", pg.UUID(as_uuid=True)),
        sa.column("role_id", pg.UUID(as_uuid=True)),
        sa.column("permission_id", pg.UUID(as_uuid=True)),
    )

    permission_ids: dict[str, uuid.UUID] = {}
    for code in _PERMISSION_CODES:
        pid = uuid.uuid4()
        permission_ids[code] = pid
        conn.execute(permissions_table.insert().values(id=pid, code=code))

    role_ids: dict[str, uuid.UUID] = {}
    for name, description in _ROLE_DESCRIPTIONS.items():
        rid = uuid.uuid4()
        role_ids[name] = rid
        conn.execute(roles_table.insert().values(id=rid, name=name, description=description))

    for role_name, codes in _ROLE_PERMISSIONS.items():
        for code in codes:
            conn.execute(
                role_permissions_table.insert().values(
                    id=uuid.uuid4(),
                    role_id=role_ids[role_name],
                    permission_id=permission_ids[code],
                )
            )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM role_permissions"))
    conn.execute(
        sa.text("DELETE FROM roles WHERE name IN ('SUPER_ADMIN', 'ADMIN', 'VIEWER')")
    )
    conn.execute(sa.text("DELETE FROM permissions WHERE code = ANY(:codes)"), {"codes": _PERMISSION_CODES})
