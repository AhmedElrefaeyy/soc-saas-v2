#!/bin/sh
set -e

echo "[startup] Applying database migrations..."
alembic upgrade head
echo "[startup] Migrations complete."

echo "[startup] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
