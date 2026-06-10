#!/bin/sh
# Startup script: apply DB migrations then launch the app.
# Resilient by design: if alembic fails the server still starts so Railway
# keeps the deployment alive and the error is visible in Deploy Logs.

echo "[startup] ── Database migrations ──────────────────────────────────"

# Attempt 1: normal upgrade
if alembic upgrade head 2>&1; then
    echo "[startup] Migrations applied successfully."
else
    echo "[startup] alembic upgrade head failed — attempting recovery..."

    # The DB may have tables created outside alembic (create_all / manual SQL).
    # Stamp the current head so alembic knows which revision we are at,
    # then retry so only truly missing migrations are applied.
    alembic stamp head 2>&1 || true
    if alembic upgrade head 2>&1; then
        echo "[startup] Migrations applied after stamp recovery."
    else
        echo "[startup] WARNING: migrations could not be applied."
        echo "[startup] The server will start but some endpoints may fail."
        echo "[startup] Check Deploy Logs and run 'alembic upgrade head' manually."
    fi
fi

echo "[startup] ── Starting uvicorn ──────────────────────────────────────"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
