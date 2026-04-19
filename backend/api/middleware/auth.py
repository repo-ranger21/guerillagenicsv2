import os
from fastapi import Header, HTTPException, status

_keys_raw = os.getenv("GG_API_KEYS", "")
VALID_API_KEYS = {k.strip() for k in _keys_raw.split(",") if k.strip()}


def require_api_key(x_api_key: str = Header(default=None)) -> str:
    if not VALID_API_KEYS:
        return "open"
    if not x_api_key or x_api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header",
        )
    return x_api_key
