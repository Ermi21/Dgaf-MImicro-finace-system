"""Phone number normalization.

The spec's location model (City/Subcity/Woreda) and language support
(English/Amharic) indicate an Ethiopian deployment, so numbers are
normalized to E.164 with the +251 country code. Adjust `_COUNTRY_CODE`
here (one place) if the client operates elsewhere.
"""

from __future__ import annotations

import re

from app.core.exceptions import ValidationFailedError

_COUNTRY_CODE = "251"
_LOCAL_MOBILE_PREFIXES = ("7", "9")  # e.g. 07xxxxxxxx, 09xxxxxxxx


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"[^\d+]", "", raw.strip())

    if digits.startswith("+"):
        digits = digits[1:]

    if digits.startswith(_COUNTRY_CODE):
        national = digits[len(_COUNTRY_CODE) :]
    elif digits.startswith("0"):
        national = digits[1:]
    else:
        national = digits

    if len(national) != 9 or national[0] not in _LOCAL_MOBILE_PREFIXES:
        raise ValidationFailedError(
            "Phone number must be a valid Ethiopian mobile number, "
            
        )

    return f"+{_COUNTRY_CODE}{national}"
