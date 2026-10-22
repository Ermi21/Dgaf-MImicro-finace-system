from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, get_current_actor, require_permission
from app.database.session import get_db
from app.permissions.constants import Permissions
from app.schemas.job import JobCreate, JobRead, JobUpdate
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobRead])
async def list_jobs(
    q: str | None = Query(default=None, description="Search by job name"),
    include_inactive: bool = Query(default=False),
    actor: AuthContext = Depends(require_permission(Permissions.JOB_VIEW)),
    session: AsyncSession = Depends(get_db),
):
    service = JobService(session)
    return await service.list_jobs(query=q, include_inactive=include_inactive)


@router.get("/active", response_model=list[JobRead])
async def list_active_jobs_public(
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    """Any authenticated Telegram user (not just admins) can call this -
    it powers the User Mini App's job picker on the registration form."""
    service = JobService(session)
    return await service.list_jobs(include_inactive=False)


@router.post("", response_model=JobRead, status_code=201)
async def create_job(
    payload: JobCreate,
    actor: AuthContext = Depends(require_permission(Permissions.JOB_CREATE)),
    session: AsyncSession = Depends(get_db),
):
    service = JobService(session)
    return await service.create_job(
        name=payload.name, description=payload.description, created_by=UUID(actor.admin_id)
    )


@router.patch("/{job_id}", response_model=JobRead)
async def update_job(
    job_id: UUID,
    payload: JobUpdate,
    actor: AuthContext = Depends(require_permission(Permissions.JOB_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = JobService(session)
    return await service.update_job(
        job_id,
        name=payload.name,
        description=payload.description,
        updated_by=UUID(actor.admin_id),
    )


@router.post("/{job_id}/activate", response_model=JobRead)
async def activate_job(
    job_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.JOB_ACTIVATE)),
    session: AsyncSession = Depends(get_db),
):
    service = JobService(session)
    return await service.set_active(job_id, is_active=True, updated_by=UUID(actor.admin_id))


@router.post("/{job_id}/deactivate", response_model=JobRead)
async def deactivate_job(
    job_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.JOB_ACTIVATE)),
    session: AsyncSession = Depends(get_db),
):
    service = JobService(session)
    return await service.set_active(job_id, is_active=False, updated_by=UUID(actor.admin_id))
