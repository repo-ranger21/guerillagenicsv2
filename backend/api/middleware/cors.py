import os

_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,https://guerillagenics.app,https://www.guerillagenics.app"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]
