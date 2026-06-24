"""Add hash chaining columns to audit_logs for tamper detection

Revision ID: 033
Revises: 032
Create Date: 2026-06-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # prev_hash: SHA-256 hex of the previous entry's entry_hash in the same tenant's chain.
    # NULL for the first entry per tenant.
    op.add_column(
        "audit_logs",
        sa.Column("prev_hash", sa.String(64), nullable=True),
    )
    # entry_hash: SHA-256 hex of the canonical serialization of this row (including prev_hash).
    # Allows offline verification that no rows were inserted, modified, or deleted.
    op.add_column(
        "audit_logs",
        sa.Column("entry_hash", sa.String(64), nullable=True),
    )
    # Index to quickly find the latest entry per tenant for chain continuation.
    op.create_index(
        "idx_audit_log_tenant_created",
        "audit_logs",
        ["tenant_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_audit_log_tenant_created", table_name="audit_logs")
    op.drop_column("audit_logs", "entry_hash")
    op.drop_column("audit_logs", "prev_hash")
