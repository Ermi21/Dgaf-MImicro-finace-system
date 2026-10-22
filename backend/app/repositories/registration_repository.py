from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.enums import RegistrationStatus
from app.models.job import Job
from app.models.location import City, Subcity, Woreda
from app.models.registration import Registration
from app.models.user import User
from app.repositories.base import BaseRepository
from app.schemas.registration import RegistrationFilter

# Statuses that count as "there's already a live registration for this job".
# A REJECTED or CANCELLED registration frees the user up to register again.
_ACTIVE_STATUSES = (
    RegistrationStatus.PENDING,
    RegistrationStatus.APPROVED,
    RegistrationStatus.SUSPENDED,
)


class RegistrationRepository(BaseRepository[Registration]):
    model = Registration

    async def get_with_relations(self, id_: uuid.UUID) -> Registration | None:
        result = await self.session.execute(
            select(Registration)
            .options(
                selectinload(Registration.user),
                selectinload(Registration.job),
                selectinload(Registration.city),
                selectinload(Registration.subcity),
                selectinload(Registration.woreda),
            )
            .where(Registration.id == id_)
        )
        return result.scalar_one_or_none()

    async def has_active_registration_for_job(
        self, *, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> bool:
        result = await self.session.execute(
            select(func.count())
            .select_from(Registration)
            .where(
                Registration.user_id == user_id,
                Registration.job_id == job_id,
                Registration.status.in_(_ACTIVE_STATUSES),
            )
        )
        return (result.scalar_one() or 0) > 0

    async def search(self, filters: RegistrationFilter) -> tuple[list[Registration], int]:
        stmt = (
            select(Registration)
            .join(User, Registration.user_id == User.id)
            .join(Job, Registration.job_id == Job.id)
            .join(City, Registration.city_id == City.id)
            .join(Subcity, Registration.subcity_id == Subcity.id)
            .join(Woreda, Registration.woreda_id == Woreda.id)
            .options(
                selectinload(Registration.user),
                selectinload(Registration.job),
                selectinload(Registration.city),
                selectinload(Registration.subcity),
                selectinload(Registration.woreda),
            )
        )

        if filters.registration_id:
            stmt = stmt.where(Registration.id == filters.registration_id)
        if filters.name:
            like = f"%{filters.name}%"
            stmt = stmt.where((User.first_name.ilike(like)) | (User.second_name.ilike(like)))
        if filters.phone:
            stmt = stmt.where(User.phone.ilike(f"%{filters.phone}%"))
        if filters.status:
            stmt = stmt.where(Registration.status == filters.status)
        if filters.job_id:
            stmt = stmt.where(Registration.job_id == filters.job_id)
        if filters.city_id:
            stmt = stmt.where(Registration.city_id == filters.city_id)
        if filters.subcity_id:
            stmt = stmt.where(Registration.subcity_id == filters.subcity_id)
        if filters.woreda_id:
            stmt = stmt.where(Registration.woreda_id == filters.woreda_id)
        if filters.employment_type:
            stmt = stmt.where(Registration.employment_type == filters.employment_type)
        if filters.date_from:
            stmt = stmt.where(Registration.created_at >= filters.date_from)
        if filters.date_to:
            stmt = stmt.where(Registration.created_at <= filters.date_to)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()

        page = max(filters.page, 1)
        page_size = max(min(filters.page_size, 100), 1)
        stmt = (
            stmt.order_by(Registration.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().unique().all())
        return items, total

    async def list_for_user(self, user_id: uuid.UUID) -> list[Registration]:
        result = await self.session.execute(
            select(Registration)
            .options(
                selectinload(Registration.job),
                selectinload(Registration.city),
                selectinload(Registration.subcity),
                selectinload(Registration.woreda),
            )
            .where(Registration.user_id == user_id)
            .order_by(Registration.created_at.desc())
        )
        return list(result.scalars().all())

    async def count_by_status(self) -> dict[str, int]:
        result = await self.session.execute(
            select(Registration.status, func.count()).group_by(Registration.status)
        )
        return {status.value: count for status, count in result.all()}
