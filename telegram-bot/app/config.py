from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            "../secrets/telegram-bot.env",
            "secrets/telegram-bot.env",
            "../../secrets/telegram-bot.env",
        ),
        case_sensitive=False,
        extra="ignore",
    )

    telegram_bot_token: str = Field(...)
    bot_service_token: str = Field(...)
    backend_api_base_url: str = Field(...)
    user_mini_app_url: str = Field(...)
    admin_mini_app_url: str = Field(...)
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
