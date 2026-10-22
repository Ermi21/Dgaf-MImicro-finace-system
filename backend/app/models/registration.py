from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import EmploymentType, RegistrationStatus

if TYPE_CHECKING:
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
        # A user may register for many different jobs, but not twice for
        # the SAME job while a prior registration for it is still "live"
        # (not REJECTED/CANCELLED). Enforced primarily in the service
        # layer (see RegistrationService) because the definition of
        # "active" spans multiple statuses; this index just makes that
        # lookup fast.
        Index("ix_registrations_user_job", "user_id", "job_id"),
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

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Registration id={self.id} status={self.status}>"
