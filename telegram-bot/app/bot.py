from __future__ import annotations

import asyncio
import logging
import socket
from typing import Any

import structlog
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
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


async def _keep_backend_alive(backend_url: str, logger: Any) -> None:
    """Sends a lightweight healthcheck ping every 10 minutes to prevent the Render
    backend from spinning down into cold sleep, ensuring the Mini Apps load instantly."""
    import aiohttp

    health_url = f"{backend_url.rstrip('/')}/api/v1/health"
    await asyncio.sleep(10)
    try:
        async with aiohttp.ClientSession() as s:
            while True:
                try:
                    async with s.get(health_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status == 200:
                            logger.debug("backend_keepalive_ping_ok")
                except Exception as e:
                    logger.debug("backend_keepalive_ping_failed", error=str(e))
                await asyncio.sleep(600)  # Render free tier sleeps after 15m; 10m keeps it warm
    except asyncio.CancelledError:
        pass


async def main() -> None:
    settings = get_settings()
    _configure_logging(settings.log_level)
    logger = structlog.get_logger("telegram_bot")

    session = AiohttpSession(limit=10)
    session._connector_init["family"] = socket.AF_INET

    bot = Bot(
        token=settings.telegram_bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        session=session,
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
    if settings.user_mini_app_url:
        try:
            from aiogram.types import MenuButtonWebApp, WebAppInfo
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="Register now",
                    web_app=WebAppInfo(url=settings.user_mini_app_url),
                )
            )
            logger.info("menu_button_updated", url=settings.user_mini_app_url)
        except Exception as e:
            logger.warning("failed_to_set_menu_button", error=str(e))

    keepalive_task = asyncio.create_task(_keep_backend_alive(settings.backend_api_base_url, logger))
    try:
        await dp.start_polling(bot)
    finally:
        keepalive_task.cancel()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
