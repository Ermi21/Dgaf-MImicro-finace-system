"""add gender, national_id, and referral fields

Revision ID: 0003_gender_referral
Revises: 0002_seed_roles_permissions
Create Date: 2026-09-04
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql as pg

revision: str = "0003_gender_referral"
down_revision: str | None = "0002_seed_roles_permissions"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    gender_enum = (
        pg.ENUM("MALE", "FEMALE", name="gender", create_type=False)
        if is_postgres
        else sa.Enum("MALE", "FEMALE", name="gender")
    )
    referral_type_enum = (
        pg.ENUM("NONE", "ADMIN", "PERSON", name="referral_type", create_type=False)
        if is_postgres
        else sa.Enum("NONE", "ADMIN", "PERSON", name="referral_type")
    )

    if is_postgres:
        gender_enum.create(bind, checkfirst=True)
        referral_type_enum.create(bind, checkfirst=True)

    with op.batch_alter_table("registrations") as batch_op:
        batch_op.add_column(sa.Column("gender", gender_enum, nullable=True))
        batch_op.add_column(sa.Column("national_id", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column("referral_type", referral_type_enum, nullable=True, server_default="NONE")
        )
        batch_op.add_column(sa.Column("referral_name", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "referral_admin_id",
                pg.UUID(as_uuid=True) if is_postgres else sa.String(36),
                sa.ForeignKey("admins.id", ondelete="SET NULL"),
                nullable=True,
            )
        )
        batch_op.create_index("ix_registrations_referral_type", ["referral_type"])
        batch_op.create_index("ix_registrations_referral_name", ["referral_name"])


def downgrade() -> None:
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_index("ix_registrations_referral_name")
        batch_op.drop_index("ix_registrations_referral_type")
        batch_op.drop_column("referral_admin_id")
        batch_op.drop_column("referral_name")
        batch_op.drop_column("referral_type")
        batch_op.drop_column("national_id")
        batch_op.drop_column("gender")
