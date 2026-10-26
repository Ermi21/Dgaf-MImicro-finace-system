from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.enums import EmploymentType, Gender, ReferralType, RegistrationStatus, Sex
from app.schemas.common import TimestampedRead
from app.schemas.job import JobRead
from app.schemas.location import CityRead, SubcityRead, WoredaRead
from app.schemas.user import UserRead


class RegistrationCreate(BaseModel):
    """What the User Mini App submits. Identity comes only from the verified session."""

    first_name: str = Field(..., min_length=2, max_length=100)
    second_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=7, max_length=20)
    city_id: UUID
    subcity_id: UUID
    woreda_id: UUID
    job_id: UUID | None = None
    employment_type: EmploymentType
    gender: Gender | None = None
    sex: Sex | None = None  # Backward compatibility
    national_id: str | None = None
    document_name: str | None = None
    document_data: str | None = None

    # Employed info
    employer_name: str | None = None
    employer_address: str | None = None
    job_title: str | None = None
    employment_contract_type: str | None = None
    length_of_employment: str | None = None
    monthly_salary: str | None = None
    employer_contact_phone: str | None = None

    # Business info (for Self-Employed)
    business_name: str | None = None
    business_type: str | None = None
    business_address: str | None = None
    business_ownership_type: str | None = None
    nature_of_business: str | None = None
    years_in_business: str | None = None
    monthly_business_income: str | None = None
    business_registration_number: str | None = None
    business_contact_phone: str | None = None

    # Generic JSON metadata
    employment_details: dict | None = None

    # Referral info
    referral_type: ReferralType | None = ReferralType.NONE
    referral_name: str | None = None
    referral_admin_id: UUID | None = None

    @field_validator("first_name", "second_name")
    @classmethod
    def _strip_names(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        if any(ch.isdigit() for ch in v) or not all(ch.isalpha() or ch in " -'" for ch in v):
            raise ValueError("Names may only contain letters, spaces, hyphens and apostrophes (no numbers or symbols)")
        return v

    @field_validator("phone")
    @classmethod
    def _strip_phone(cls, v: str) -> str:
        return v.strip()

    @field_validator("national_id")
    @classmethod
    def _validate_national_id(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip().replace(" ", "").replace("-", "")
            if not v:
                return None
            if not v.isdigit():
                raise ValueError("National ID must contain numbers only")
            if len(v) > 16:
                raise ValueError("National ID must not exceed 16 digits (Ethiopian National ID standard)")
            return v
        return None

    @field_validator("referral_name")
    @classmethod
    def _strip_referral_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None


class RegistrationRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=1000)

    @field_validator("reason")
    @classmethod
    def _strip_reason(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Rejection reason cannot be blank")
        return v


class RegistrationApproveRequest(BaseModel):
    message: str | None = None


class RegistrationNotifyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)


class RegistrationRead(TimestampedRead):
    status: RegistrationStatus
    employment_type: EmploymentType
    gender: Gender | None = None
    sex: Sex | None = None
    national_id: str | None = None
    document_name: str | None = None
    document_data: str | None = None

    # Employed fields
    employer_name: str | None = None
    employer_address: str | None = None
    job_title: str | None = None
    employment_contract_type: str | None = None
    length_of_employment: str | None = None
    monthly_salary: str | None = None
    employer_contact_phone: str | None = None

    # Business fields
    business_name: str | None = None
    business_type: str | None = None
    business_address: str | None = None
    business_ownership_type: str | None = None
    nature_of_business: str | None = None
    years_in_business: str | None = None
    monthly_business_income: str | None = None
    business_registration_number: str | None = None
    business_contact_phone: str | None = None

    employment_details: dict | None = None

    referral_type: ReferralType | None = None
    referral_name: str | None = None
    referral_admin_id: UUID | None = None
    referral_admin_name: str | None = None
    rejection_reason: str | None = None
    approved_at: datetime | None = None
    rejected_at: datetime | None = None
    suspended_at: datetime | None = None

    user: UserRead
    job: JobRead
    city: CityRead
    subcity: SubcityRead
    woreda: WoredaRead


class RegistrationListItem(TimestampedRead):
    """Flatter/lighter shape for list views."""

    status: RegistrationStatus
    employment_type: EmploymentType
    gender: Gender | None = None
    sex: Sex | None = None
    national_id: str | None = None
    document_name: str | None = None
    employer_name: str | None = None
    business_name: str | None = None
    employment_details: dict | None = None
    referral_type: ReferralType | None = None
    referral_name: str | None = None
    referral_admin_id: UUID | None = None
    referral_admin_name: str | None = None
    user_first_name: str
    user_second_name: str
    user_phone: str
    job_name: str
    city_name: str
    subcity_name: str
    woreda_name: str


class MyRegistrationItem(TimestampedRead):
    """Lighter shape for a user's own '/registrations/me' list."""

    status: RegistrationStatus
    employment_type: EmploymentType
    gender: Gender | None = None
    sex: Sex | None = None
    national_id: str | None = None
    referral_type: ReferralType | None = None
    referral_name: str | None = None
    rejection_reason: str | None = None
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
    gender: Gender | None = None
    referral_type: ReferralType | None = None
    referrer_name: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = 1
    page_size: int = 20

