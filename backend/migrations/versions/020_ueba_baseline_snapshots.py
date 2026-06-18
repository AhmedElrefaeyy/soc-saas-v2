"""020_ueba_baseline_snapshots

Revision ID: 020
Revises: 019
Create Date: 2026-06-18

Adds ueba_baseline_snapshots table for durable UEBA baseline storage.
Prevents 48-hour false-positive storm after pod restarts.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ueba_baseline_snapshots (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id    UUID NOT NULL,
            key_type     VARCHAR(32) NOT NULL,
            entity_key   VARCHAR(512) NOT NULL,
            values_json  JSONB NOT NULL DEFAULT '[]',
            snapshot_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, key_type, entity_key)
        )
    """))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_ueba_baseline_tenant "
        "ON ueba_baseline_snapshots (tenant_id, key_type)"
    ))


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS ueba_baseline_snapshots"))
