"""Domain-level exceptions and FastAPI error handlers.

Business/service code raises these instead of HTTPException so that
the domain layer stays framework-agnostic. The API layer translates
them to HTTP responses in one place. Internal exceptions (unexpected
bugs, DB errors) are logged with full detail server-side but returned
to clients as a generic 500 message - stack traces never leave the
backend.
"""

from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)

HTTP_422_UNPROCESSABLE_CONTENT = 422


class DomainError(Exception):
    """Base class for all business-rule / domain errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "domain_error"

    def __init__(self, message: str, *, code: str | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class ValidationFailedError(DomainError):
    status_code = HTTP_422_UNPROCESSABLE_CONTENT
    code = "validation_failed"


class DuplicateRegistrationError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "duplicate_registration"


class InvalidStatusTransitionError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "invalid_status_transition"


class InvalidLocationHierarchyError(DomainError):
    status_code = HTTP_422_UNPROCESSABLE_CONTENT
    code = "invalid_location_hierarchy"


class InactiveResourceError(DomainError):
    status_code = HTTP_422_UNPROCESSABLE_CONTENT
    code = "inactive_resource"


class AuthenticationError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "authentication_failed"


class PermissionDeniedError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "permission_denied"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        logger.info(
            "domain_error",
            path=request.url.path,
            code=exc.code,
            message=exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            exc_type=type(exc).__name__,
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected error occurred. Please try again later.",
                }
            },
        )
