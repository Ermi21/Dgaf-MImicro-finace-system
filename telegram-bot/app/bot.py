from __future__ import annotations

import asyncio
import logging

import structlog
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from app.config import get_settings
from app.handlers import admin, common, start, user
from app.middlewares.logging import LoggingMiddleware


def _configure_logging(level: str) -> None:
    logging.basicConfig(format="%(message)s", level=getattr(logging, level.upper(), logging.INFO))
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
    )


async def main() -> None:
    settings = get_settings()
    _configure_logging(settings.log_level)
    logger = structlog.get_logger("telegram_bot")

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    dp.message.middleware(LoggingMiddleware())
    dp.update.middleware(LoggingMiddleware())

    # `settings` is injected into every handler's kwargs automatically by
    # aiogram (matched by parameter name against workflow_data) - this is
    # how handlers get access to config without any handler constructing
    # its own BackendClient with hardcoded values.
    dp["settings"] = settings

    dp.include_router(start.router)
    dp.include_router(common.router)
    dp.include_router(user.router)
    dp.include_router(admin.router)

    logger.info("bot_starting")
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
