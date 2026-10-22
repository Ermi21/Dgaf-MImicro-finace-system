from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.location import City, Subcity, Woreda
from app.repositories.base import BaseRepository


class CityRepository(BaseRepository[City]):
    model = City

    async def list_active(self) -> list[City]:
        result = await self.session.execute(select(City).where(City.is_active.is_(True)))
        return list(result.scalars().all())


class SubcityRepository(BaseRepository[Subcity]):
    model = Subcity

    async def list_active_by_city(self, city_id: uuid.UUID) -> list[Subcity]:
        result = await self.session.execute(
            select(Subcity).where(Subcity.city_id == city_id, Subcity.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def belongs_to_city(self, subcity_id: uuid.UUID, city_id: uuid.UUID) -> bool:
        subcity = await self.get_by_id(subcity_id)
        return bool(subcity and subcity.city_id == city_id)


class WoredaRepository(BaseRepository[Woreda]):
    model = Woreda

    async def list_active_by_subcity(self, subcity_id: uuid.UUID) -> list[Woreda]:
        result = await self.session.execute(
            select(Woreda).where(Woreda.subcity_id == subcity_id, Woreda.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def belongs_to_subcity(self, woreda_id: uuid.UUID, subcity_id: uuid.UUID) -> bool:
        woreda = await self.get_by_id(woreda_id)
        return bool(woreda and woreda.subcity_id == subcity_id)
