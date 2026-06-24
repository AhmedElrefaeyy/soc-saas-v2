"""Add composite index on events(tenant_id, event_timestamp) for retention worker performance

Revision ID: 032
Revises: 031
Create Date: 2026-06-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Composite index speeds up the retention worker's DELETE … WHERE tenant_id = ? AND
    # event_timestamp < NOW() - INTERVAL '? days' query significantly on large tables.
    op.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_events_tenant_ingested
        ON events (tenant_id, event_timestamp)
    """))


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_events_tenant_ingested"))
