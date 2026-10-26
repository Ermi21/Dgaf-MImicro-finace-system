from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import InvalidLocationHierarchyError, NotFoundError
from app.models.location import City, Subcity, Woreda
from app.repositories.location_repository import CityRepository, SubcityRepository, WoredaRepository


ETHIOPIAN_CITY_HIERARCHIES: dict[str, dict[str, list[str]]] = {
    "addis ababa": {
        "Bole": [f"Woreda {i:02d}" for i in range(1, 15)],
        "Yeka": [f"Woreda {i:02d}" for i in range(1, 14)],
        "Kirkos": [f"Woreda {i:02d}" for i in range(1, 12)],
        "Arada": [f"Woreda {i:02d}" for i in range(1, 11)],
        "Lideta": [f"Woreda {i:02d}" for i in range(1, 11)],
        "Nifas Silk-Lafto": [f"Woreda {i:02d}" for i in range(1, 16)],
        "Kolfe Keranio": [f"Woreda {i:02d}" for i in range(1, 16)],
        "Gullele": [f"Woreda {i:02d}" for i in range(1, 11)],
        "Akaki Kality": [f"Woreda {i:02d}" for i in range(1, 14)],
        "Addis Ketema": [f"Woreda {i:02d}" for i in range(1, 11)],
        "Lemi Kura": [f"Woreda {i:02d}" for i in range(1, 11)],
    },
    "bahir dar": {
        "Belay Zeleke": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Fasilo": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Gish Abay": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Shimbit": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Tana": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Ginbot 20": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Hidar 11": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "hawassa": {
        "Tabor": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Hayek Dare": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Menahariya": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Misrak": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Hawela-Tula": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Mehal Ketema": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Bahil Adarash": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Addis Ketema": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "adama": {
        "Boku": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Dugda": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Geda": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Melka Adama": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Lugo": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "dire dewa": {
        "Sabian": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Megala": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Gende Kore": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Dechatu": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Melka Jebdu": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "gondar": {
        "Arada": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Fasil": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Maraki": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Azezo": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Zobel": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Jantekel": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "mekelle": {
        "Hawelti": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Kedamay Weyane": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Ayder": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Hadnet": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Semien": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Quiha": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Adi Haki": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "jimma": {
        "Mendera": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Becho Bore": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Hirmata": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Ginjo": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Jiren": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "dessie": {
        "Hotie": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Buanbua Wuha": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Segno Gebeya": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Arada": [f"Woreda {i:02d}" for i in range(1, 5)],
        "Menafesha": [f"Woreda {i:02d}" for i in range(1, 5)],
    },
    "harar": {
        "Abadir": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Shenkor": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Amir Nur": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Hakim": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Jin'Eala": [f"Woreda {i:02d}" for i in range(1, 4)],
    },
    "jigjiga": {
        "Dudum Ad": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Zone 01": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Zone 02": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Zone 03": [f"Woreda {i:02d}" for i in range(1, 4)],
    },
    "shashamane": {
        "Arada": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Awasho": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Alelu": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Dida Boke": [f"Woreda {i:02d}" for i in range(1, 4)],
    },
    "bishoftu": {
        "Bishoftu Central": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Hora": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Bake": [f"Woreda {i:02d}" for i in range(1, 4)],
        "Dukem Road": [f"Woreda {i:02d}" for i in range(1, 4)],
    },
}

DEFAULT_SUBCITIES: dict[str, list[str]] = {
    "Central / Mehal Ketema": [f"Woreda {i:02d}" for i in range(1, 5)],
    "North / Semien": [f"Woreda {i:02d}" for i in range(1, 5)],
    "South / Debub": [f"Woreda {i:02d}" for i in range(1, 5)],
    "East / Misrak": [f"Woreda {i:02d}" for i in range(1, 5)],
    "West / Mirab": [f"Woreda {i:02d}" for i in range(1, 5)],
}


class LocationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.cities = CityRepository(session)
        self.subcities = SubcityRepository(session)
        self.woredas = WoredaRepository(session)

    # --- reads -------------------------------------------------------

    async def list_cities(self, include_inactive: bool = False) -> list[City]:
        return await self.cities.list_all(include_inactive=include_inactive)

    async def list_subcities(self, city_id: uuid.UUID, include_inactive: bool = False) -> list[Subcity]:
        if not await self.cities.get_by_id(city_id):
            raise NotFoundError("City not found")
        return await self.subcities.list_by_city(city_id, include_inactive=include_inactive)

    async def list_woredas(self, subcity_id: uuid.UUID, include_inactive: bool = False) -> list[Woreda]:
        if not await self.subcities.get_by_id(subcity_id):
            raise NotFoundError("Subcity not found")
        return await self.woredas.list_by_subcity(subcity_id, include_inactive=include_inactive)

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

    async def create_city(self, name: str, auto_populate: bool = True) -> City:
        city = City(name=name)
        city = await self.cities.add(city)
        if auto_populate:
            await self.auto_populate_city_hierarchy(city.id)
        return city

    async def auto_populate_city_hierarchy(self, city_id: uuid.UUID) -> dict[str, int]:
        city = await self.cities.get_by_id(city_id)
        if not city:
            raise NotFoundError("City not found")

        city_name_lower = city.name.strip().lower()
        hierarchy = ETHIOPIAN_CITY_HIERARCHIES.get(city_name_lower, DEFAULT_SUBCITIES)

        existing_subcities = await self.subcities.list_by_city(city_id, include_inactive=True)
        existing_sub_map = {s.name.strip().lower(): s for s in existing_subcities}

        subcities_added = 0
        woredas_added = 0

        for sub_name, woreda_names in hierarchy.items():
            sub_obj = existing_sub_map.get(sub_name.strip().lower())
            if not sub_obj:
                sub_obj = Subcity(name=sub_name, city_id=city_id, is_active=True)
                self.session.add(sub_obj)
                await self.session.flush()
                existing_sub_map[sub_name.strip().lower()] = sub_obj
                subcities_added += 1

            existing_woredas = await self.woredas.list_by_subcity(sub_obj.id, include_inactive=True)
            existing_woreda_names = {w.name.strip().lower() for w in existing_woredas}

            for w_name in woreda_names:
                if w_name.strip().lower() not in existing_woreda_names:
                    w_obj = Woreda(name=w_name, subcity_id=sub_obj.id, is_active=True)
                    self.session.add(w_obj)
                    existing_woreda_names.add(w_name.strip().lower())
                    woredas_added += 1

        await self.session.flush()
        return {"subcities_added": subcities_added, "woredas_added": woredas_added}

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
