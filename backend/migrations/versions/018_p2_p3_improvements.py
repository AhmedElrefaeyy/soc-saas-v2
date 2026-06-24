"""018_p2_p3_improvements

Revision ID: 018
Revises: 017_ueba_reasons
Create Date: 2026-06-18

P2: Add triggering_alert_ids to investigations (alert → investigation linkage)

NOTE — Revision ID naming convention:
  Migrations 001–017 use descriptive IDs (e.g. "017_ueba_reasons").
  Migrations 018+ use short numeric IDs (e.g. "018").
  Both styles are valid Alembic revision IDs. Do NOT rename any existing
  revision ID — that would break the migration chain for every deployed DB.
  New migrations should continue the short numeric style ("030", "031", ...).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "018"
down_revision = "017_ueba_reasons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # P2: investigation → alert linkage
    op.execute(sa.text(
        "ALTER TABLE investigations "
        "ADD COLUMN IF NOT EXISTS triggering_alert_ids JSONB NOT NULL DEFAULT '[]'"
    ))


def downgrade() -> None:
    op.execute(sa.text(
        "ALTER TABLE investigations DROP COLUMN IF EXISTS triggering_alert_ids"
    ))
