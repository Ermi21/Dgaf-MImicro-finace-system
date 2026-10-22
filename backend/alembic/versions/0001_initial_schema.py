"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def _uuid_pk():
    return sa.Column(
        "id",
        pg.UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def _timestamps():
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
    ]


def upgrade() -> None:
    # pgcrypto provides gen_random_uuid(); Supabase projects have it
    # available, this just makes sure it's enabled.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    employment_type = pg.ENUM("EMPLOYEE", "SELF_EMPLOYED", name="employment_type")
    registration_status = pg.ENUM(
        "PENDING", "APPROVED", "REJECTED", "SUSPENDED", "CANCELLED", name="registration_status"
    )
    notification_status = pg.ENUM("PENDING", "SENT", "FAILED", name="notification_status")
    notification_recipient_status = pg.ENUM(
        "PENDING", "SENT", "FAILED", name="notification_recipient_status"
    )
    notification_audience_type = pg.ENUM(
        "INDIVIDUAL",
        "ALL_USERS",
        "BY_JOB",
        "BY_CITY",
        "BY_SUBCITY",
        "BY_WOREDA",
        "BY_EMPLOYMENT_TYPE",
        "BY_REGISTRATION_STATUS",
        name="notification_audience_type",
    )

    bind = op.get_bind()
    employment_type.create(bind, checkfirst=True)
    registration_status.create(bind, checkfirst=True)
    notification_status.create(bind, checkfirst=True)
    notification_recipient_status.create(bind, checkfirst=True)
    notification_audience_type.create(bind, checkfirst=True)

    # ---------------------------------------------------------------
    # Reference / lookup tables first (no FKs out)
    # ---------------------------------------------------------------

    op.create_table(
        "roles",
        _uuid_pk(),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        *_timestamps(),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )
    op.create_index("ix_roles_name", "roles", ["name"])

    op.create_table(
        "permissions",
        _uuid_pk(),
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        *_timestamps(),
        sa.UniqueConstraint("code", name="uq_permissions_code"),
    )
    op.create_index("ix_permissions_code", "permissions", ["code"])

    op.create_table(
        "cities",
        _uuid_pk(),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("name", name="uq_cities_name"),
    )
    op.create_index("ix_cities_name", "cities", ["name"])

    op.create_table(
        "users",
        _uuid_pk(),
        sa.Column("telegram_id", sa.BigInteger, nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("second_name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("telegram_id", name="uq_users_telegram_id"),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])
    op.create_index("ix_users_phone", "users", ["phone"])

    op.create_table(
        "system_settings",
        _uuid_pk(),
        sa.Column("key", sa.String(150), nullable=False),
        sa.Column("value", sa.JSON, nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        *_timestamps(),
        sa.UniqueConstraint("key", name="uq_system_settings_key"),
    )
    op.create_index("ix_system_settings_key", "system_settings", ["key"])

    # ---------------------------------------------------------------
    # Tables with FKs to the above
    # ---------------------------------------------------------------

    op.create_table(
        "role_permissions",
        _uuid_pk(),
        sa.Column(
            "role_id", pg.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "permission_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("permissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        *_timestamps(),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    op.create_table(
        "admins",
        _uuid_pk(),
        sa.Column("telegram_id", sa.BigInteger, nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column(
            "role_id", pg.UUID(as_uuid=True), sa.ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("telegram_id", name="uq_admins_telegram_id"),
    )
    op.create_index("ix_admins_telegram_id", "admins", ["telegram_id"])

    op.create_table(
        "subcities",
        _uuid_pk(),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "city_id", pg.UUID(as_uuid=True), sa.ForeignKey("cities.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("city_id", "name", name="uq_subcity_city_name"),
    )
    op.create_index("ix_subcities_name", "subcities", ["name"])

    op.create_table(
        "jobs",
        _uuid_pk(),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column(
            "created_by", pg.UUID(as_uuid=True), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column(
            "updated_by", pg.UUID(as_uuid=True), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
        ),
        *_timestamps(),
    )
    op.create_index("ix_jobs_name", "jobs", ["name"])
    op.create_index("ix_jobs_is_active", "jobs", ["is_active"])

    op.create_table(
        "woredas",
        _uuid_pk(),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "subcity_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("subcities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        *_timestamps(),
        sa.UniqueConstraint("subcity_id", "name", name="uq_woreda_subcity_name"),
    )
    op.create_index("ix_woredas_name", "woredas", ["name"])

    op.create_table(
        "registrations",
        _uuid_pk(),
        sa.Column(
            "user_id", pg.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "job_id", pg.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "city_id", pg.UUID(as_uuid=True), sa.ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False
        ),
        sa.Column(
            "subcity_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("subcities.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "woreda_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("woredas.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("employment_type", employment_type, nullable=False),
        sa.Column(
            "status", registration_status, nullable=False, server_default="PENDING"
        ),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column(
            "approved_by", pg.UUID(as_uuid=True), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "rejected_by", pg.UUID(as_uuid=True), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "suspended_by", pg.UUID(as_uuid=True), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_registrations_status", "registrations", ["status"])
    op.create_index("ix_registrations_job_id", "registrations", ["job_id"])
    op.create_index("ix_registrations_city_id", "registrations", ["city_id"])
    op.create_index("ix_registrations_subcity_id", "registrations", ["subcity_id"])
    op.create_index("ix_registrations_woreda_id", "registrations", ["woreda_id"])
    op.create_index("ix_registrations_created_at", "registrations", ["created_at"])
    op.create_index("ix_registrations_user_job", "registrations", ["user_id", "job_id"])

    op.create_table(
        "notifications",
        _uuid_pk(),
        sa.Column(
            "sender_admin_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("admins.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("audience_type", notification_audience_type, nullable=False),
        sa.Column("audience_filter", sa.JSON, nullable=True),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "status", notification_status, nullable=False, server_default="PENDING"
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text, nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_notifications_status", "notifications", ["status"])

    op.create_table(
        "notification_recipients",
        _uuid_pk(),
        sa.Column(
            "notification_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("notifications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id", pg.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "status",
            notification_recipient_status,
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text, nullable=True),
        sa.Column("retry_count", sa.Integer, nullable=False, server_default="0"),
        *_timestamps(),
    )
    op.create_index(
        "ix_notification_recipients_status", "notification_recipients", ["status"]
    )

    op.create_table(
        "activity_logs",
        _uuid_pk(),
        sa.Column(
            "admin_id", pg.UUID(as_uuid=True), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(64), nullable=False),
        sa.Column("old_value", sa.JSON, nullable=True),
        sa.Column("new_value", sa.JSON, nullable=True),
        sa.Column("metadata", sa.JSON, nullable=True),
        *_timestamps(),
    )
    op.create_index("ix_activity_logs_entity", "activity_logs", ["entity_type", "entity_id"])
    op.create_index("ix_activity_logs_admin_id", "activity_logs", ["admin_id"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("activity_logs")
    op.drop_table("notification_recipients")
    op.drop_table("notifications")
    op.drop_table("registrations")
    op.drop_table("woredas")
    op.drop_table("jobs")
    op.drop_table("subcities")
    op.drop_table("admins")
    op.drop_table("role_permissions")
    op.drop_table("system_settings")
    op.drop_table("users")
    op.drop_table("cities")
    op.drop_table("permissions")
    op.drop_table("roles")

    bind = op.get_bind()
    pg.ENUM(name="notification_audience_type").drop(bind, checkfirst=True)
    pg.ENUM(name="notification_recipient_status").drop(bind, checkfirst=True)
    pg.ENUM(name="notification_status").drop(bind, checkfirst=True)
    pg.ENUM(name="registration_status").drop(bind, checkfirst=True)
    pg.ENUM(name="employment_type").drop(bind, checkfirst=True)
