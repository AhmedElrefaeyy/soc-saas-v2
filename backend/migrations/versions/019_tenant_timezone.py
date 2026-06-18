"""019_tenant_timezone

Revision ID: 019
Revises: 018
Create Date: 2026-06-18

Add timezone column to tenants table for per-tenant UEBA business-hours config.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'UTC'"
    ))


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE tenants DROP COLUMN IF EXISTS timezone"))
