"""Structured logging configuration.

Uses structlog so every log line is JSON-friendly and can carry
contextual fields (request_id, admin_id, action) without string
formatting bugs. Secrets (tokens, passwords, init-data) must never be
passed into log calls - see `redact()`.
"""

import logging
import sys

import structlog

from app.core.config import get_settings

_SENSITIVE_KEYS = {
    "token",
    "bot_token",
    "telegram_bot_token",
    "password",
    "secret",
    "jwt_secret",
    "supabase_service_role_key",
    "init_data",
    "authorization",
}


def redact(value: dict) -> dict:
    """Shallow-redact known-sensitive keys before logging a dict."""
    return {k: ("***REDACTED***" if k.lower() in _SENSITIVE_KEYS else v) for k, v in value.items()}


def configure_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.log_json:
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    return structlog.get_logger(name)
