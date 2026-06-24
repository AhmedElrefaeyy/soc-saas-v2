"""Add MFA TOTP columns to users

Revision ID: 030
Revises: 029
Create Date: 2026-06-22

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── MFA columns on users ───────────────────────────────────────────────────
    op.add_column("users", sa.Column("totp_secret", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("totp_enabled_at", sa.TIMESTAMP(timezone=True), nullable=True))
    op.add_column("users", sa.Column("mfa_backup_codes", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "mfa_backup_codes")
    op.drop_column("users", "totp_enabled_at")
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
