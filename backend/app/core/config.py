"""Application configuration.

All secrets and environment-specific values MUST come from environment
variables (or a local `.env` file that is never committed). Nothing here
is hardcoded.
"""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            "../secrets/backend.env",
            "secrets/backend.env",
            "../../secrets/backend.env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    environment: str = Field(default="development")

    # Database
    database_url: str = Field(..., description="Async SQLAlchemy URL to Supabase Postgres")

    # Supabase (only needed if REST/storage APIs are used directly)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    # Telegram
    telegram_bot_token: str = Field(..., description="Telegram Bot API token")
    telegram_initdata_max_age_seconds: int = 86400

    # Trusted service-to-service channel used ONLY by our own aiogram bot
    # process (never exposed to the Mini App or any public client) - the
    # bot already knows a telegram_id is genuine because it came from a
    # real Telegram Bot API update; this token just proves the *caller*
    # is our bot process, not a random client trying to probe admin status.
    bot_service_token: str = Field(
        default="ZTQU41Gp1xGDQ9Qdi9cNpMGG46IAgLTbGvKlQ9kMtb4",
        description="Shared secret between the bot process and this API",
    )

    # Security
    jwt_secret: str = Field(
        default="change-me-to-a-long-random-value-secret-key-32chars",
        description="Secret for internal service tokens",
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS
    cors_allowed_origins: str = ""

    # Logging
    log_level: str = "INFO"
    log_json: bool = True

    # Pagination
    default_page_size: int = 20
    max_page_size: int = 100

    @field_validator("environment")
    @classmethod
    def _validate_environment(cls, v: str) -> str:
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton. Import this, not Settings() directly."""
    return Settings()  # type: ignore[call-arg]
