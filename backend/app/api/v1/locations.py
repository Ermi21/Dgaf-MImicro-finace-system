from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import AuthContext, get_current_actor, require_permission
from app.database.session import get_db
from app.permissions.constants import Permissions
from app.schemas.location import (
    CityCreate,
    CityRead,
    SubcityCreate,
    SubcityRead,
    WoredaCreate,
    WoredaRead,
)
from app.services.location_service import LocationService

router = APIRouter(tags=["locations"])


@router.get("/cities", response_model=list[CityRead])
async def list_cities(
    include_inactive: bool = False,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    # Only admins may see inactive cities
    allow_inactive = include_inactive and actor.is_admin
    return await service.list_cities(include_inactive=allow_inactive)


@router.get("/cities/{city_id}/subcities", response_model=list[SubcityRead])
async def list_subcities(
    city_id: UUID,
    include_inactive: bool = False,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    allow_inactive = include_inactive and actor.is_admin
    return await service.list_subcities(city_id, include_inactive=allow_inactive)


@router.get("/subcities/{subcity_id}/woredas", response_model=list[WoredaRead])
async def list_woredas(
    subcity_id: UUID,
    include_inactive: bool = False,
    actor: AuthContext = Depends(get_current_actor),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    allow_inactive = include_inactive and actor.is_admin
    return await service.list_woredas(subcity_id, include_inactive=allow_inactive)


@router.post("/cities", response_model=CityRead, status_code=201)
async def create_city(
    payload: CityCreate,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_CREATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.create_city(payload.name, auto_populate=payload.auto_populate)


@router.post("/cities/{city_id}/auto-populate")
async def auto_populate_city(
    city_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    """Auto-populates official subcities and woredas for an Ethiopian city."""
    service = LocationService(session)
    return await service.auto_populate_city_hierarchy(city_id)


@router.post("/subcities", response_model=SubcityRead, status_code=201)
async def create_subcity(
    payload: SubcityCreate,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_CREATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.create_subcity(payload.name, payload.city_id)


@router.post("/woredas", response_model=WoredaRead, status_code=201)
async def create_woreda(
    payload: WoredaCreate,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_CREATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.create_woreda(payload.name, payload.subcity_id)


@router.post("/cities/{city_id}/activate", response_model=CityRead)
async def activate_city(
    city_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.set_city_active(city_id, is_active=True)


@router.post("/cities/{city_id}/deactivate", response_model=CityRead)
async def deactivate_city(
    city_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.set_city_active(city_id, is_active=False)


@router.post("/subcities/{subcity_id}/activate", response_model=SubcityRead)
async def activate_subcity(
    subcity_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.set_subcity_active(subcity_id, is_active=True)


@router.post("/subcities/{subcity_id}/deactivate", response_model=SubcityRead)
async def deactivate_subcity(
    subcity_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.set_subcity_active(subcity_id, is_active=False)


@router.post("/woredas/{woreda_id}/activate", response_model=WoredaRead)
async def activate_woreda(
    woreda_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.set_woreda_active(woreda_id, is_active=True)


@router.post("/woredas/{woreda_id}/deactivate", response_model=WoredaRead)
async def deactivate_woreda(
    woreda_id: UUID,
    actor: AuthContext = Depends(require_permission(Permissions.LOCATION_UPDATE)),
    session: AsyncSession = Depends(get_db),
):
    service = LocationService(session)
    return await service.set_woreda_active(woreda_id, is_active=False)
