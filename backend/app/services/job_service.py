from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InactiveResourceError, NotFoundError
from app.models.job import Job
from app.repositories.job_repository import JobRepository


class JobService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = JobRepository(session)

    async def list_jobs(
        self, *, query: str | None = None, include_inactive: bool = False
    ) -> list[Job]:
        return await self.repo.search(query=query, include_inactive=include_inactive)

    async def get_active_job_or_raise(self, job_id: uuid.UUID) -> Job:
        job = await self.repo.get_by_id(job_id)
        if not job:
            raise NotFoundError("Job not found")
        if not job.is_active:
            raise InactiveResourceError("This job is no longer accepting registrations")
        return job

    async def create_job(self, *, name: str, description: str | None, created_by: uuid.UUID) -> Job:
        job = Job(name=name, description=description, created_by=created_by, updated_by=created_by)
        return await self.repo.add(job)

    async def update_job(
        self,
        job_id: uuid.UUID,
        *,
        name: str | None,
        description: str | None,
        updated_by: uuid.UUID,
    ) -> Job:
        job = await self.repo.get_by_id(job_id)
        if not job:
            raise NotFoundError("Job not found")
        if name is not None:
            job.name = name
        if description is not None:
            job.description = description
        job.updated_by = updated_by
        return job

    async def set_active(self, job_id: uuid.UUID, *, is_active: bool, updated_by: uuid.UUID) -> Job:
        """Soft activate/deactivate. Jobs referenced by historical
        registrations are never hard-deleted (spec section 14)."""
        job = await self.repo.get_by_id(job_id)
        if not job:
            raise NotFoundError("Job not found")
        job.is_active = is_active
        job.updated_by = updated_by
        return job
