"""Thin wrapper around the Telegram Bot API `sendMessage` call.

Kept separate from business logic (NotificationService) so the HTTP
transport details - retries, timeouts, the bot token - stay isolated in
one place and are easy to mock in tests.
"""

from __future__ import annotations

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramDeliveryError(Exception):
    """Raised for retryable delivery failures (timeouts, 5xx, rate limiting)."""


class TelegramPermanentError(Exception):
    """Raised for failures that will never succeed on retry (bot blocked,
    chat not found, malformed request) - caller should mark as FAILED
    immediately rather than retrying."""


class TelegramClient:
    def __init__(self, bot_token: str, *, timeout: float = 10.0):
        self._token = bot_token
        self._timeout = timeout

    @retry(
        retry=retry_if_exception_type(TelegramDeliveryError),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def send_message(self, chat_id: int, text: str) -> None:
        url = f"{TELEGRAM_API_BASE}/bot{self._token}/sendMessage"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(
                    url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
                )
            except httpx.TimeoutException as exc:
                raise TelegramDeliveryError("Telegram API request timed out") from exc
            except httpx.TransportError as exc:
                raise TelegramDeliveryError(f"Telegram API transport error: {exc}") from exc

        if response.status_code == 429:
            # Telegram rate limit - retry_after is in the response body.
            raise TelegramDeliveryError("Telegram API rate limit hit (429)")
        if response.status_code >= 500:
            raise TelegramDeliveryError(f"Telegram API server error: {response.status_code}")
        if response.status_code >= 400:
            body = response.text[:300]
            raise TelegramPermanentError(
                f"Telegram API rejected request ({response.status_code}): {body}"
            )
