from fastapi import APIRouter

from app.api.v1 import (
    activity_logs,
    admin_management,
    auth,
    bot_internal,
    health,
    jobs,
    locations,
    notifications,
    registrations,
    reports,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(bot_internal.router)
api_router.include_router(users.router)
api_router.include_router(registrations.router)
api_router.include_router(jobs.router)
api_router.include_router(locations.router)
api_router.include_router(notifications.router)
api_router.include_router(reports.router)
api_router.include_router(activity_logs.router)
api_router.include_router(admin_management.router)
