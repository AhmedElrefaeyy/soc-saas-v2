#!/bin/sh
# Container startup: apply DB schema then launch the app or worker.

# Worker mode: skip migrations (web service already ran them), start worker directly.
if [ "${WORKER_MODE:-false}" = "true" ]; then
    echo "[startup] ── Worker mode ──────────────────────────────────────────────"
    # Minimal HTTP health probe so Railway healthcheck passes (worker has no uvicorn)
    python3 -c "
import http.server, socketserver
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{\"status\":\"ok\",\"service\":\"worker\"}')
    def log_message(self, *a): pass
with socketserver.TCPServer(('', 8000), H) as s:
    s.serve_forever()
" &
    exec python -m app.workers.main
fi

echo "[startup] ── Database schema ────────────────────────────────────────"

# Attempt 1: standard alembic migration path (works on clean Railway DBs)
if alembic upgrade head 2>&1; then
    echo "[startup] Migrations applied via alembic."
else
    echo "[startup] alembic upgrade head failed (likely tables pre-exist)."
    echo "[startup] Falling back to create_all..."

    # Attempt 2: create_all(checkfirst=True) creates only missing tables/enums.
    # Then stamps alembic_version so future upgrades are no-ops.
    if python ensure_schema.py; then
        echo "[startup] Schema ready via ensure_schema."
    else
        echo "[startup] WARNING: schema setup failed — server starting anyway."
        echo "[startup] Some endpoints may return 500. Check Railway Deploy Logs."
    fi
fi

echo "[startup] ── Starting uvicorn ──────────────────────────────────────"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
