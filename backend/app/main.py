from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import database_manager
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.redis import redis_manager

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    configure_logging(
        log_level=settings.LOG_LEVEL,
        environment=settings.ENVIRONMENT,
    )
    logger.info(
        "application_starting",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )

    await database_manager.initialize()
    await redis_manager.initialize()

    logger.info("application_ready")
    yield

    logger.info("application_shutting_down")
    await redis_manager.close()
    await database_manager.close()
    logger.info("application_shutdown_complete")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Enterprise SOC SaaS Platform API",
        # Disable docs in production
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ─── Exception handlers (registered before middleware so they are wrapped) ──
    register_exception_handlers(app)

    # ─── Middleware (LAST add_middleware call = OUTERMOST layer) ─────────────
    # RequestContextMiddleware is registered first → sits INSIDE CORSMiddleware.
    # CORSMiddleware is registered last → OUTERMOST, so it adds CORS headers to
    # ALL responses including those produced by exception handlers.
    app.add_middleware(RequestContextMiddleware)

    origins = settings.ALLOWED_ORIGINS
    use_wildcard = origins == ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # Accept any Railway deployment automatically (no Variables needed).
        allow_origin_regex=settings.CORS_ALLOW_ORIGIN_REGEX or None,
        # Wildcard origin cannot be combined with allow_credentials=True.
        allow_credentials=not use_wildcard,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )

    # ─── Routes ───────────────────────────────────────────────────────────────
    from app.api.v1.router import api_router
    app.include_router(api_router, prefix=settings.API_PREFIX)

    return app


app = create_application()
