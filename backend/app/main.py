from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger

settings = get_settings()
configure_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup", environment=settings.environment)
    yield
    logger.info("shutdown")


app = FastAPI(
    title="Job Seeker Registration and Employment Management Platform",
    version="0.1.0",
    lifespan=lifespan,
    # Hide interactive docs in production - they're a low-value attack
    # surface once the API is customer-facing.
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

_cors_origins = ["*"] if settings.environment == "development" else (settings.cors_origins_list or [])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

register_exception_handlers(app)
app.include_router(api_router)
