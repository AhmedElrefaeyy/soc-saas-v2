"""Add UEBA anomaly detection fields to events

Revision ID: 016_ueba_anomaly_detection
Revises: 015_threat_intel_enrichment
Create Date: 2026-06-17
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_ueba_anomaly_detection"
down_revision: Union[str, None] = "015_threat_intel_enrichment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS"
        " anomaly_score FLOAT NOT NULL DEFAULT 0.0"
    ))
    op.execute(sa.text(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS"
        " is_anomaly BOOLEAN NOT NULL DEFAULT FALSE"
    ))
    op.execute(sa.text(
        "ALTER TABLE events ADD COLUMN IF NOT EXISTS"
        " ueba_flags JSONB NOT NULL DEFAULT '[]'"
    ))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_event_is_anomaly"
        " ON events (tenant_id, is_anomaly)"
    ))


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS idx_event_is_anomaly"))
    op.drop_column("events", "ueba_flags")
    op.drop_column("events", "is_anomaly")
    op.drop_column("events", "anomaly_score")
