from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.middleware.rate_limit import limiter
from api.middleware.cors import ALLOWED_ORIGINS
from api.routes import (futures, needle, standings, bracket,
                        players, odds, alerts, watchlist, health)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app = FastAPI(
    title="GuerillaGenics Core Engine",
    version="2.0.0",
    description="Futures-only sports prediction engine"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)

app.include_router(health.router)
app.include_router(futures.router, prefix="/api/v1")
app.include_router(needle.router, prefix="/api/v1")
app.include_router(standings.router, prefix="/api/v1")
app.include_router(bracket.router, prefix="/api/v1")
app.include_router(players.router, prefix="/api/v1")
app.include_router(odds.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(watchlist.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "product": "GuerillaGenics",
        "version": "2.0.0",
        "status": "operational",
        "docs": "/docs"
    }
