from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import EmploymentType, RegistrationStatus
from app.schemas.common import TimestampedRead
from app.schemas.job import JobRead
from app.schemas.location import CityRead, SubcityRead, WoredaRead
from app.schemas.user import UserRead


class RegistrationCreate(BaseModel):
    """What the User Mini App submits. Note there is NO telegram_id or
    user_id field here - identity comes only from the verified session
    (see app.api.v1.deps.get_current_user), never from client input."""

    first_name: str = Field(..., min_length=2, max_length=100)
    second_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=7, max_length=20)
    city_id: UUID
    subcity_id: UUID
    woreda_id: UUID
    job_id: UUID
    employment_type: EmploymentType

    @field_validator("first_name", "second_name")
    @classmethod
    def _strip_names(cls, v: str) -> str:
        v = v.strip()
        if not v or not all(ch.isalpha() or ch in " -'" for ch in v):
            raise ValueError("Names may only contain letters, spaces, hyphens and apostrophes")
        return v

    @field_validator("phone")
    @classmethod
    def _strip_phone(cls, v: str) -> str:
        return v.strip()


class RegistrationRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)

    @field_validator("reason")
    @classmethod
    def _strip_reason(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Rejection reason cannot be blank")
        return v


class RegistrationRead(TimestampedRead):
    status: RegistrationStatus
    employment_type: EmploymentType
    rejection_reason: str | None
    approved_at: datetime | None
    rejected_at: datetime | None
    suspended_at: datetime | None

    user: UserRead
    job: JobRead
    city: CityRead
    subcity: SubcityRead
    woreda: WoredaRead


class RegistrationListItem(TimestampedRead):
    """Flatter/lighter shape for list views (avoids over-fetching nested reads)."""

    status: RegistrationStatus
    employment_type: EmploymentType
    user_first_name: str
    user_second_name: str
    user_phone: str
    job_name: str
    city_name: str
    subcity_name: str
    woreda_name: str


class MyRegistrationItem(TimestampedRead):
    """Lighter shape for a user's own '/registrations/me' list - doesn't
    redundantly echo back the user's own name/phone."""

    status: RegistrationStatus
    employment_type: EmploymentType
    rejection_reason: str | None
    job_name: str
    city_name: str
    subcity_name: str
    woreda_name: str


class RegistrationFilter(BaseModel):
    registration_id: UUID | None = None
    name: str | None = None
    phone: str | None = None
    status: RegistrationStatus | None = None
    job_id: UUID | None = None
    city_id: UUID | None = None
    subcity_id: UUID | None = None
    woreda_id: UUID | None = None
    employment_type: EmploymentType | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    page_size: int = 20
