from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InactiveResourceError, NotFoundError
from app.models.enums import EmploymentType
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

    async def get_default_active_job_or_raise(self) -> Job:
        active_jobs = await self.repo.list_active()
        if not active_jobs:
            raise InactiveResourceError("No active jobs are currently available")
        if len(active_jobs) > 1:
            raise InactiveResourceError(
                "Multiple active jobs are available; a specific job_id is required."
            )
        return active_jobs[0]

    async def infer_active_job_by_employment_type(
        self, employment_type: EmploymentType
    ) -> Job | None:
        active_jobs = await self.repo.list_active()
        if not active_jobs:
            raise InactiveResourceError("No active jobs are currently available")

        normalized_value = employment_type.value.replace("_", "-").lower()
        exact_matches = [
            job
            for job in active_jobs
            if job.name.strip().lower() == employment_type.value.lower()
            or job.name.strip().lower() == normalized_value
            or job.name.strip().lower() == normalized_value.replace("-", " ")
        ]
        if len(exact_matches) == 1:
            return exact_matches[0]

        if len(active_jobs) == 1:
            return active_jobs[0]

        if employment_type == EmploymentType.SELF_EMPLOYED:
            fuzzy_matches = [
                job
                for job in active_jobs
                if "self" in job.name.lower() and "employ" in job.name.lower()
            ]
        else:
            fuzzy_matches = [job for job in active_jobs if "employee" in job.name.lower()]

        if len(fuzzy_matches) == 1:
            return fuzzy_matches[0]

        # Fallback for current frontend behavior: if the client does not send a
        # specific job_id, choose a default active job rather than rejecting the
        # request outright. This keeps registration working when the UI only
        # submits employment_type.
        return active_jobs[0]

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
