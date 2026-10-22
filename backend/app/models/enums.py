"""Shared enums. Stored in Postgres as native ENUM types via SQLAlchemy."""

import enum


class EmploymentType(str, enum.Enum):
    EMPLOYEE = "EMPLOYEE"
    SELF_EMPLOYED = "SELF_EMPLOYED"


class RegistrationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"
    CANCELLED = "CANCELLED"


# Explicit allow-list of valid transitions (section 8 of the spec).
# Kept next to the enum so the state machine can never silently drift
# out of sync with the values above.
ALLOWED_REGISTRATION_TRANSITIONS: dict[RegistrationStatus, set[RegistrationStatus]] = {
    RegistrationStatus.PENDING: {RegistrationStatus.APPROVED, RegistrationStatus.REJECTED},
    RegistrationStatus.APPROVED: {RegistrationStatus.SUSPENDED},
    RegistrationStatus.SUSPENDED: {RegistrationStatus.APPROVED},
    RegistrationStatus.REJECTED: {RegistrationStatus.PENDING},
    RegistrationStatus.CANCELLED: set(),
}
"""CANCELLED exists as a terminal status (e.g. a user withdrawing their own
pending registration) but is intentionally NOT part of the admin approval
state machine above - the spec only defines the five transitions listed."""


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class NotificationAudienceType(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    ALL_USERS = "ALL_USERS"
    BY_JOB = "BY_JOB"
    BY_CITY = "BY_CITY"
    BY_SUBCITY = "BY_SUBCITY"
    BY_WOREDA = "BY_WOREDA"
    BY_EMPLOYMENT_TYPE = "BY_EMPLOYMENT_TYPE"
    BY_REGISTRATION_STATUS = "BY_REGISTRATION_STATUS"


class RoleName(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    VIEWER = "VIEWER"
