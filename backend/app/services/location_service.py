from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidLocationHierarchyError, NotFoundError
from app.models.location import City, Subcity, Woreda
from app.repositories.location_repository import CityRepository, SubcityRepository, WoredaRepository


class LocationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.cities = CityRepository(session)
        self.subcities = SubcityRepository(session)
        self.woredas = WoredaRepository(session)

    # --- reads -------------------------------------------------------

    async def list_cities(self) -> list[City]:
        return await self.cities.list_active()

    async def list_subcities(self, city_id: uuid.UUID) -> list[Subcity]:
        if not await self.cities.get_by_id(city_id):
            raise NotFoundError("City not found")
        return await self.subcities.list_active_by_city(city_id)

    async def list_woredas(self, subcity_id: uuid.UUID) -> list[Woreda]:
        if not await self.subcities.get_by_id(subcity_id):
            raise NotFoundError("Subcity not found")
        return await self.woredas.list_active_by_subcity(subcity_id)

    # --- validation used by RegistrationService -----------------------

    async def validate_hierarchy_active(
        self, *, city_id: uuid.UUID, subcity_id: uuid.UUID, woreda_id: uuid.UUID
    ) -> tuple[City, Subcity, Woreda]:
        city = await self.cities.get_by_id(city_id)
        if not city or not city.is_active:
            raise InvalidLocationHierarchyError("Selected city is invalid or inactive")

        subcity = await self.subcities.get_by_id(subcity_id)
        if not subcity or not subcity.is_active:
            raise InvalidLocationHierarchyError("Selected subcity/zone is invalid or inactive")
        if subcity.city_id != city.id:
            raise InvalidLocationHierarchyError(
                "Selected subcity does not belong to the selected city"
            )

        woreda = await self.woredas.get_by_id(woreda_id)
        if not woreda or not woreda.is_active:
            raise InvalidLocationHierarchyError("Selected woreda is invalid or inactive")
        if woreda.subcity_id != subcity.id:
            raise InvalidLocationHierarchyError(
                "Selected woreda does not belong to the selected subcity"
            )

        return city, subcity, woreda

    # --- writes (Super Admin / authorized Admin only, enforced at API layer) ---

    async def create_city(self, name: str) -> City:
        city = City(name=name)
        return await self.cities.add(city)

    async def create_subcity(self, name: str, city_id: uuid.UUID) -> Subcity:
        if not await self.cities.get_by_id(city_id):
            raise NotFoundError("City not found")
        subcity = Subcity(name=name, city_id=city_id)
        return await self.subcities.add(subcity)

    async def create_woreda(self, name: str, subcity_id: uuid.UUID) -> Woreda:
        if not await self.subcities.get_by_id(subcity_id):
            raise NotFoundError("Subcity not found")
        woreda = Woreda(name=name, subcity_id=subcity_id)
        return await self.woredas.add(woreda)

    async def set_city_active(self, city_id: uuid.UUID, is_active: bool) -> City:
        city = await self.cities.get_by_id(city_id)
        if not city:
            raise NotFoundError("City not found")
        city.is_active = is_active  # soft deactivation - historical registrations keep the FK
        return city

    async def set_subcity_active(self, subcity_id: uuid.UUID, is_active: bool) -> Subcity:
        subcity = await self.subcities.get_by_id(subcity_id)
        if not subcity:
            raise NotFoundError("Subcity not found")
        subcity.is_active = is_active
        return subcity

    async def set_woreda_active(self, woreda_id: uuid.UUID, is_active: bool) -> Woreda:
        woreda = await self.woredas.get_by_id(woreda_id)
        if not woreda:
            raise NotFoundError("Woreda not found")
        woreda.is_active = is_active
        return woreda
