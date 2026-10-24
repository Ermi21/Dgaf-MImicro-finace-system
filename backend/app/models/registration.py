from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import EmploymentType, Gender, ReferralType, RegistrationStatus, Sex

if TYPE_CHECKING:
    from app.models.admin import Admin
    from app.models.job import Job
    from app.models.location import City, Subcity, Woreda
    from app.models.user import User


class Registration(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "registrations"
    __table_args__ = (
        Index("ix_registrations_status", "status"),
        Index("ix_registrations_job_id", "job_id"),
        Index("ix_registrations_city_id", "city_id"),
        Index("ix_registrations_subcity_id", "subcity_id"),
        Index("ix_registrations_woreda_id", "woreda_id"),
        Index("ix_registrations_created_at", "created_at"),
        Index("ix_registrations_user_job", "user_id", "job_id"),
        Index("ix_registrations_referral_type", "referral_type"),
        Index("ix_registrations_referral_name", "referral_name"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False
    )
    subcity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subcities.id", ondelete="RESTRICT"), nullable=False
    )
    woreda_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("woredas.id", ondelete="RESTRICT"), nullable=False
    )

    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(EmploymentType, name="employment_type", native_enum=True), nullable=False
    )
    gender: Mapped[Gender | None] = mapped_column(
        Enum(Gender, name="gender", native_enum=True), nullable=True
    )
    national_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Referral system
    referral_type: Mapped[ReferralType | None] = mapped_column(
        Enum(ReferralType, name="referral_type", native_enum=True),
        nullable=True,
        default=ReferralType.NONE,
    )
    referral_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    referral_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[RegistrationStatus] = mapped_column(
        Enum(RegistrationStatus, name="registration_status", native_enum=True),
        nullable=False,
        default=RegistrationStatus.PENDING,
    )

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    rejected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    suspended_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admins.id", ondelete="SET NULL"), nullable=True
    )
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="registrations")
    job: Mapped[Job] = relationship(back_populates="registrations")
    city: Mapped[City] = relationship()
    subcity: Mapped[Subcity] = relationship()
    woreda: Mapped[Woreda] = relationship()
    referral_admin: Mapped[Admin | None] = relationship(foreign_keys=[referral_admin_id])

    @property
    def sex(self) -> Gender | None:
        """Backward-compatibility alias."""
        return self.gender

    @sex.setter
    def sex(self, value: Gender | None) -> None:
        self.gender = value

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Registration id={self.id} status={self.status}>"

