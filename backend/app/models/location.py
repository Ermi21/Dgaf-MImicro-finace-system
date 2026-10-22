from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    pass


class City(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "cities"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    subcities: Mapped[list[Subcity]] = relationship(
        back_populates="city", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<City name={self.name}>"


class Subcity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A Subcity/Zone. Must always belong to exactly one City."""

    __tablename__ = "subcities"
    __table_args__ = (UniqueConstraint("city_id", "name", name="uq_subcity_city_name"),)

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    city: Mapped[City] = relationship(back_populates="subcities")
    woredas: Mapped[list[Woreda]] = relationship(
        back_populates="subcity", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Subcity name={self.name} city_id={self.city_id}>"


class Woreda(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Must always belong to exactly one Subcity."""

    __tablename__ = "woredas"
    __table_args__ = (UniqueConstraint("subcity_id", "name", name="uq_woreda_subcity_name"),)

    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subcity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subcities.id", ondelete="CASCADE"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    subcity: Mapped[Subcity] = relationship(back_populates="woredas")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Woreda name={self.name} subcity_id={self.subcity_id}>"
