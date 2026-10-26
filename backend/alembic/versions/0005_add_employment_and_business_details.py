"""add employment and business details to registrations

Revision ID: 0005_employment_business
Revises: 0004_document_fields
Create Date: 2026-10-26
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_employment_business"
down_revision: str | None = "0004_document_fields"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("registrations") as batch_op:
        # Employed customer fields
        batch_op.add_column(sa.Column("employer_name", sa.String(200), nullable=True))
        batch_op.add_column(sa.Column("employer_address", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("job_title", sa.String(150), nullable=True))
        batch_op.add_column(sa.Column("employment_contract_type", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("length_of_employment", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("monthly_salary", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("employer_contact_phone", sa.String(50), nullable=True))

        # Self-employed customer fields
        batch_op.add_column(sa.Column("business_name", sa.String(200), nullable=True))
        batch_op.add_column(sa.Column("business_type", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("business_address", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("business_ownership_type", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("nature_of_business", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("years_in_business", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("monthly_business_income", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("business_registration_number", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("business_contact_phone", sa.String(50), nullable=True))

        # JSON metadata bundle for maximum forward compatibility
        batch_op.add_column(sa.Column("employment_details", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("registrations") as batch_op:
        batch_op.drop_column("employment_details")
        batch_op.drop_column("business_contact_phone")
        batch_op.drop_column("business_registration_number")
        batch_op.drop_column("monthly_business_income")
        batch_op.drop_column("years_in_business")
        batch_op.drop_column("nature_of_business")
        batch_op.drop_column("business_ownership_type")
        batch_op.drop_column("business_address")
        batch_op.drop_column("business_type")
        batch_op.drop_column("business_name")
        batch_op.drop_column("employer_contact_phone")
        batch_op.drop_column("monthly_salary")
        batch_op.drop_column("length_of_employment")
        batch_op.drop_column("employment_contract_type")
        batch_op.drop_column("job_title")
        batch_op.drop_column("employer_address")
        batch_op.drop_column("employer_name")
