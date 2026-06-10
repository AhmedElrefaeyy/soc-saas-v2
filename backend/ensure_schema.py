"""
Fallback schema creator — runs when alembic upgrade head fails.

Uses SQLAlchemy create_all(checkfirst=True) which:
  - Checks each table/enum BEFORE creating it
  - Creates only what is missing — never touches existing objects
  - Handles all PostgreSQL ENUM types automatically

After success, stamps alembic_version to head so future
`alembic upgrade head` calls become no-ops.
"""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models import Base  # registers all tables into Base.metadata


async def main() -> int:
    connect_args: dict = {}
    if settings.is_production:
        connect_args["ssl"] = "require"

    engine = create_async_engine(
        settings.async_database_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)

        # Stamp alembic so future `alembic upgrade head` is a no-op
        async with engine.begin() as conn:
            await conn.execute(text(
                "CREATE TABLE IF NOT EXISTS alembic_version "
                "(version_num VARCHAR(32) NOT NULL, "
                "CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num))"
            ))
            await conn.execute(text("DELETE FROM alembic_version"))
            await conn.execute(text("INSERT INTO alembic_version VALUES ('006_api_keys')"))

        print("[ensure_schema] All missing tables created. Stamped alembic to 006_api_keys.")
        return 0
    except Exception as exc:
        print(f"[ensure_schema] Failed: {exc}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
