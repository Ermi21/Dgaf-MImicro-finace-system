from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import structlog
from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update

logger = structlog.get_logger("telegram_bot")


class LoggingMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        telegram_id = None
        kind = type(event).__name__
        if isinstance(event, Update) and event.message and event.message.from_user:
            telegram_id = event.message.from_user.id
            kind = "message"

        logger.info("update_received", kind=kind, telegram_id=telegram_id)
        try:
            return await handler(event, data)
        except Exception:
            logger.exception("handler_error", kind=kind, telegram_id=telegram_id)
            raise
