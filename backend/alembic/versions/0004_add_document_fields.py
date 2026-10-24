"""add document_name and document_data to registrations

Revision ID: 0004_document_fields
Revises: 0003_gender_referral
Create Date: 2026-10-24
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_document_fields"
down_revision: str | None = "0003_gender_referral"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.add_column(sa.Column("document_name", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("document_data", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_column("document_data")
        batch_op.drop_column("document_name")
