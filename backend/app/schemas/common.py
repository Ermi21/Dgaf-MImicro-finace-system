from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMBase(BaseModel):
    """Base for schemas that read from SQLAlchemy ORM objects."""

    model_config = ConfigDict(from_attributes=True)


class TimestampedRead(ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class PageParams(BaseModel):
    page: int = 1
    page_size: int = 20


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, page_size: int) -> Page[T]:
        total_pages = (total + page_size - 1) // page_size if page_size else 0
        return cls(
            items=items, total=total, page=page, page_size=page_size, total_pages=total_pages
        )
