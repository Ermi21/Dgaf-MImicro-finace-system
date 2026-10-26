from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import (
    DuplicateRegistrationError,
    InvalidStatusTransitionError,
    NotFoundError,
    PermissionDeniedError,
    ValidationFailedError,
)
from app.core.logging import get_logger
from app.database.base import utcnow

logger = get_logger(__name__)
from app.models.admin import Admin
from app.models.enums import ALLOWED_REGISTRATION_TRANSITIONS, ReferralType, RegistrationStatus
from app.models.registration import Registration
from app.models.user import User
from app.repositories.admin_repository import AdminRepository
from app.repositories.registration_repository import RegistrationRepository
from app.repositories.user_repository import UserRepository
from app.schemas.registration import RegistrationCreate, RegistrationFilter
from app.services.activity_log_service import ActivityLogService
from app.services.job_service import JobService
from app.services.location_service import LocationService
from app.services.notification_service import NotificationService
from app.services.phone_utils import normalize_phone

# User-facing copy for automatic notifications (spec section 16). In a
# real deployment these strings come from the i18n layer keyed by the
# user's stored `language` - kept simple/inline here since translation
# wiring lives in the frontend/bot layer, not this service.
_MESSAGES = {
    "submitted": "Your registration for '{job}' has been received and is pending review.",
    "approved": "Good news! Your registration for '{job}' has been approved.",
    "rejected": "Your registration for '{job}' was rejected. Reason: {reason}",
    "suspended": "Your registration for '{job}' has been suspended by an administrator.",
    "resumed": "Your registration for '{job}' has been reactivated and is now approved.",
}


class RegistrationService:
    def __init__(self, session: AsyncSession, settings: Settings):
        self.session = session
        self.settings = settings
        self.repo = RegistrationRepository(session)
        self.user_repo = UserRepository(session)
        self.locations = LocationService(session)
        self.jobs = JobService(session)
        self.activity_log = ActivityLogService(session)
        self.notifications = NotificationService(session, settings.telegram_bot_token)

    # ------------------------------------------------------------------
    # Create (spec section 7 - all 15 steps)
    # ------------------------------------------------------------------

    async def create_registration(
        self, *, telegram_id: int, payload: RegistrationCreate
    ) -> Registration:
        # 1-2: first/second name syntactic validation already enforced by
        #      RegistrationCreate's Pydantic validators.
        # 3-4: phone validation + normalization.
        normalized_phone = normalize_phone(payload.phone)

        # 5-9: city/subcity/woreda existence, active status, and hierarchy.
        await self.locations.validate_hierarchy_active(
            city_id=payload.city_id, subcity_id=payload.subcity_id, woreda_id=payload.woreda_id
        )

        # 10-11: Job resolution & validation
        if payload.job_id is not None:
            job = await self.jobs.get_active_job_or_raise(payload.job_id)
        else:
            job = await self.jobs.infer_active_job_by_employment_type(payload.employment_type)

        # 12: employment type already validated by the Pydantic enum field.

        # 13: telegram_id passed in here has ALREADY been verified by
        #     app.core.security.verify_telegram_init_data upstream of this
        #     call (see app/api/v1/deps.py) - never accepted raw from the
        #     request body.
        user = await self.user_repo.get_or_create(
            telegram_id=telegram_id,
            first_name=payload.first_name,
            second_name=payload.second_name,
            phone=normalized_phone,
        )

        # 14: duplicate-registration rule (one active registration per job).
        if await self.repo.has_active_registration_for_job(user_id=user.id, job_id=job.id):
            raise DuplicateRegistrationError("You already have an active registration for this job.")


        # 15: create transactionally. All of the above repo/service calls
        #     share `self.session`; the FastAPI `get_db` dependency commits
        #     once at the end of the request and rolls back the whole
        #     thing on any exception, so this is atomic end-to-end.
        referral_admin_id = payload.referral_admin_id
        if not referral_admin_id and payload.referral_type == ReferralType.ADMIN and payload.referral_name:
            admin_match = await self.session.execute(
                select(Admin.id).where(func.lower(func.trim(Admin.name)) == payload.referral_name.strip().lower())
            )
            matched_id = admin_match.scalars().first()
            if matched_id:
                referral_admin_id = matched_id

        gender_val = payload.gender or payload.sex
        registration = Registration(
            user_id=user.id,
            job_id=job.id,
            city_id=payload.city_id,
            subcity_id=payload.subcity_id,
            woreda_id=payload.woreda_id,
            employment_type=payload.employment_type,
            gender=gender_val,
            national_id=payload.national_id,
            document_name=payload.document_name,
            document_data=payload.document_data,
            referral_type=payload.referral_type,
            referral_name=payload.referral_name,
            referral_admin_id=referral_admin_id,
            status=RegistrationStatus.PENDING,
        )
        registration = await self.repo.add(registration)

        await self.activity_log.record(
            admin_id=None,
            action="registration.created",
            entity_type="registration",
            entity_id=str(registration.id),
            new_value={"status": RegistrationStatus.PENDING.value, "job_id": str(job.id)},
        )
        await self.notifications.notify_registration_event(
            user_id=user.id,
            message=_MESSAGES["submitted"].format(job=job.name),
        )

        return registration

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    async def get_registration_or_raise(self, registration_id: uuid.UUID) -> Registration:
        registration = await self.repo.get_with_relations(registration_id)
        if not registration:
            raise NotFoundError("Registration not found")
        return registration

    async def get_own_registration_or_raise(
        self, registration_id: uuid.UUID, *, telegram_id: int
    ) -> Registration:
        registration = await self.get_registration_or_raise(registration_id)
        user = await self.user_repo.get_by_telegram_id(telegram_id)
        if not user or registration.user_id != user.id:
            raise PermissionDeniedError("This registration does not belong to you")
        return registration

    async def list_own_registrations(self, *, telegram_id: int) -> list[Registration]:
        return await self.repo.list_for_telegram_id(telegram_id)

    async def search(self, filters: RegistrationFilter) -> tuple[list[Registration], int]:
        return await self.repo.search(filters)

    async def dashboard_counts(self) -> dict[str, int]:
        return await self.repo.count_by_status()

    # ------------------------------------------------------------------
    # Status transitions (spec section 8 state machine + sections 12/13)
    # ------------------------------------------------------------------

    def _assert_transition_allowed(
        self, current: RegistrationStatus, target: RegistrationStatus
    ) -> None:
        allowed = ALLOWED_REGISTRATION_TRANSITIONS.get(current, set())
        if target not in allowed:
            raise InvalidStatusTransitionError(
                f"Cannot move a registration from {current.value} to {target.value}"
            )

    async def approve(
        self,
        registration_id: uuid.UUID,
        *,
        admin_id: uuid.UUID | None,
        message: str | None = None,
    ) -> Registration:
        registration = await self.get_registration_or_raise(registration_id)
        self._assert_transition_allowed(registration.status, RegistrationStatus.APPROVED)

        old_status = registration.status
        registration.status = RegistrationStatus.APPROVED
        registration.approved_by = admin_id
        registration.approved_at = utcnow()

        await self.activity_log.record(
            admin_id=admin_id,
            action="registration.approved",
            entity_type="registration",
            entity_id=str(registration.id),
            old_value={"status": old_status.value},
            new_value={"status": RegistrationStatus.APPROVED.value},
        )
        notif_text = (
            message.strip()
            if message and message.strip()
            else _MESSAGES["approved"].format(job=registration.job.name)
        )
        notif = await self.notifications.notify_registration_event(
            user_id=registration.user_id,
            message=notif_text,
        )
        try:
            await self.notifications.dispatch(notif.id)
        except Exception as exc:
            logger.warning("approve_notification_dispatch_failed", error=str(exc))

        return registration

    async def reject(
        self, registration_id: uuid.UUID, *, admin_id: uuid.UUID | None, reason: str
    ) -> Registration:
        registration = await self.get_registration_or_raise(registration_id)
        self._assert_transition_allowed(registration.status, RegistrationStatus.REJECTED)

        old_status = registration.status
        registration.status = RegistrationStatus.REJECTED
        registration.rejection_reason = reason
        registration.rejected_by = admin_id
        registration.rejected_at = utcnow()

        await self.activity_log.record(
            admin_id=admin_id,
            action="registration.rejected",
            entity_type="registration",
            entity_id=str(registration.id),
            old_value={"status": old_status.value},
            new_value={"status": RegistrationStatus.REJECTED.value, "reason": reason},
        )
        notif = await self.notifications.notify_registration_event(
            user_id=registration.user_id,
            message=_MESSAGES["rejected"].format(job=registration.job.name, reason=reason),
        )
        try:
            await self.notifications.dispatch(notif.id)
        except Exception as exc:
            logger.warning("reject_notification_dispatch_failed", error=str(exc))

        return registration

    async def suspend(self, registration_id: uuid.UUID, *, admin_id: uuid.UUID | None) -> Registration:
        registration = await self.get_registration_or_raise(registration_id)
        self._assert_transition_allowed(registration.status, RegistrationStatus.SUSPENDED)

        old_status = registration.status
        registration.status = RegistrationStatus.SUSPENDED
        registration.suspended_by = admin_id
        registration.suspended_at = utcnow()

        await self.activity_log.record(
            admin_id=admin_id,
            action="registration.suspended",
            entity_type="registration",
            entity_id=str(registration.id),
            old_value={"status": old_status.value},
            new_value={"status": RegistrationStatus.SUSPENDED.value},
        )
        await self.notifications.notify_registration_event(
            user_id=registration.user_id,
            message=_MESSAGES["suspended"].format(job=registration.job.name),
        )
        return registration

    async def resume(self, registration_id: uuid.UUID, *, admin_id: uuid.UUID | None) -> Registration:
        """SUSPENDED -> APPROVED, per the transition table in spec section 8."""
        registration = await self.get_registration_or_raise(registration_id)
        self._assert_transition_allowed(registration.status, RegistrationStatus.APPROVED)

        old_status = registration.status
        registration.status = RegistrationStatus.APPROVED
        registration.approved_by = admin_id
        registration.approved_at = utcnow()

        await self.activity_log.record(
            admin_id=admin_id,
            action="registration.resumed",
            entity_type="registration",
            entity_id=str(registration.id),
            old_value={"status": old_status.value},
            new_value={"status": RegistrationStatus.APPROVED.value},
        )
        await self.notifications.notify_registration_event(
            user_id=registration.user_id,
            message=_MESSAGES["resumed"].format(job=registration.job.name),
        )
        return registration

    async def reset_to_pending(
        self, registration_id: uuid.UUID, *, admin_id: uuid.UUID | None
    ) -> Registration:
        """REJECTED -> PENDING, per the transition table in spec section 8
        (e.g. an admin decides to give a rejected application another look)."""
        registration = await self.get_registration_or_raise(registration_id)
        self._assert_transition_allowed(registration.status, RegistrationStatus.PENDING)

        old_status = registration.status
        registration.status = RegistrationStatus.PENDING
        registration.rejection_reason = None

        await self.activity_log.record(
            admin_id=admin_id,
            action="registration.reset_to_pending",
            entity_type="registration",
            entity_id=str(registration.id),
            old_value={"status": old_status.value},
            new_value={"status": RegistrationStatus.PENDING.value},
        )
        return registration

    async def delete_registration(
        self, registration_id: uuid.UUID, *, admin_id: uuid.UUID | None
    ) -> None:
        """Permanently delete a REJECTED or CANCELLED registration record.
        Active (PENDING/APPROVED/SUSPENDED) registrations cannot be deleted —
        they must be rejected/cancelled first."""
        registration = await self.get_registration_or_raise(registration_id)
        if registration.status not in (RegistrationStatus.REJECTED, RegistrationStatus.CANCELLED):
            from app.core.exceptions import ValidationFailedError
            raise ValidationFailedError(
                f"Cannot delete a registration with status '{registration.status.value}'. "
                "Only REJECTED or CANCELLED registrations can be deleted."
            )

        user_id = registration.user_id

        await self.activity_log.record(
            admin_id=admin_id,
            action="registration.deleted",
            entity_type="registration",
            entity_id=str(registration_id),
            old_value={"status": registration.status.value},
            new_value=None,
        )
        await self.session.delete(registration)
        await self.session.flush()

        # If this customer has no other remaining registrations, eliminate the customer row as well
        remaining_count = await self.session.scalar(
            select(func.count()).select_from(Registration).where(Registration.user_id == user_id)
        )
        if (remaining_count or 0) == 0:
            user = await self.session.get(User, user_id)
            if user:
                await self.session.delete(user)
