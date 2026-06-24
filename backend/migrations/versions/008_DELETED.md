# Migration 008 — DELETED

Migration 008 was intentionally removed during development before it was ever
applied to any environment.

The Alembic revision chain skips from `007_alert_metadata` directly to
`009_chat_history`.  This is valid — Alembic does not require sequential
numbering; it follows the `down_revision` pointers.

**Do not create a new migration named 008.**  Any future migration should
continue from the current head (`029_tenant_logo_url`).
