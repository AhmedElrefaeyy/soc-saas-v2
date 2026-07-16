"""Add pgvector extension and embedding column to rag_knowledge_base

Revision ID: 031
Revises: 030
Create Date: 2026-06-22
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Check availability before attempting — pgvector must be installed on the
    # PostgreSQL server (not just as a Python package). Some managed providers
    # (e.g. Railway) include it by default; self-hosted or other providers may not.
    result = conn.execute(sa.text(
        "SELECT COUNT(*) FROM pg_available_extensions WHERE name = 'vector'"
    ))
    if result.scalar() == 0:
        # pgvector not available on this server — skip embedding column.
        # Semantic RAG search will be disabled; all other features work normally.
        return

    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
    op.execute(sa.text("""
        ALTER TABLE rag_knowledge_base
          ADD COLUMN IF NOT EXISTS embedding vector(1536)
    """))
    op.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_rag_kb_embedding_hnsw
        ON rag_knowledge_base
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """))


def downgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT COUNT(*) FROM pg_available_extensions WHERE name = 'vector'"
    ))
    if result.scalar() == 0:
        return
    op.execute(sa.text("DROP INDEX IF EXISTS ix_rag_kb_embedding_hnsw"))
    op.execute(sa.text("""
        ALTER TABLE rag_knowledge_base DROP COLUMN IF EXISTS embedding
    """))
