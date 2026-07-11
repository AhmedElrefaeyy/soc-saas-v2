"""detection_rule_fp_reduction_2: fix SeTcbPrivilege and Event 4648 false positives

Revision ID: 036
Revises: 035
Create Date: 2026-06-27

1. SeTcbPrivilege/SeDebugPrivilege rule — adds none_of exclusion for Windows
   built-in system accounts (SYSTEM, DWM-N, UMFD-N, LOCAL SERVICE, NETWORK SERVICE,
   Window Manager) that always receive these privileges at startup. Also increases
   suppression from 600s → 3600s to reduce repetitive alerting.

2. Explicit Credential Use (Event 4648) — converts from pattern to threshold rule
   requiring 3+ events in 10 minutes on the same host. This eliminates the false
   positive from a single UAC elevation prompt while preserving lateral movement
   detection. Suppression increased to 3600s.
"""

from __future__ import annotations

import json
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB


revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── 1. SeTcbPrivilege / SeDebugPrivilege rule ──────────────────────────────
    new_conditions_setcb = [
        {"field": "raw.windows_event_id", "op": "eq", "value": "4672"},
        {
            "op": "any_of",
            "conditions": [
                {"field": "raw.message", "op": "contains", "value": "SeTcbPrivilege"},
                {"field": "raw.message", "op": "contains", "value": "SeDebugPrivilege"},
            ],
        },
        {
            "op": "none_of",
            "conditions": [
                {"field": "raw.message", "op": "regex", "value": r"Account Name:\s+SYSTEM\b"},
                {"field": "raw.message", "op": "regex", "value": r"Account Name:\s+DWM-\d+"},
                {"field": "raw.message", "op": "regex", "value": r"Account Name:\s+UMFD-\d+"},
                {"field": "raw.message", "op": "regex", "value": r"Account Name:\s+LOCAL SERVICE"},
                {"field": "raw.message", "op": "regex", "value": r"Account Name:\s+NETWORK SERVICE"},
                {"field": "raw.message", "op": "regex", "value": r"Account Name:\s+Window Manager"},
            ],
        },
    ]

    _jsonb = JSONB()
    result = conn.execute(
        text("""
            UPDATE detection_rules
            SET
                description = :desc,
                conditions  = :cond,
                suppression_window_secs = :supp
            WHERE name = :name
        """).bindparams(sa.bindparam("cond", type_=_jsonb)),
        {
            "name": "Privilege Escalation - SeTcbPrivilege or SeDebugPrivilege Granted",
            "desc": (
                "High-privilege token rights (SeTcbPrivilege or SeDebugPrivilege) assigned at logon — "
                "these allow process injection and SYSTEM-level impersonation. "
                "Windows built-in system accounts (SYSTEM, DWM, UMFD, Window Manager) that always "
                "receive these privileges at startup are excluded to prevent constant noise."
            ),
            "cond": new_conditions_setcb,
            "supp": 3600,
        },
    )
    print(f"[036] SeTcbPrivilege rule: updated {result.rowcount} row(s)")

    # ── 2. Event 4648 — convert to threshold rule ──────────────────────────────
    new_conditions_4648 = {
        "field": "hostname",
        "group_by": "hostname",
        "threshold": 3,
        "window_secs": 600,
        "filters": [
            {"field": "raw.windows_event_id", "op": "eq", "value": "4648"},
        ],
    }

    result = conn.execute(
        text("""
            UPDATE detection_rules
            SET
                rule_type   = 'threshold',
                description = :desc,
                conditions  = :cond,
                suppression_window_secs = :supp
            WHERE name = :name
        """).bindparams(sa.bindparam("cond", type_=_jsonb)),
        {
            "name": "Explicit Credential Use - Pass-the-Hash Indicator (Event 4648)",
            "desc": (
                "Logon with explicit credentials other than the logged-on user (Event 4648). "
                "Classic indicator of pass-the-hash, pass-the-ticket, or runas abuse. "
                "UAC elevation on the same host (most common benign trigger) is suppressed "
                "by a 3-event threshold requiring at least 3 occurrences in 10 minutes — "
                "a single UAC prompt does not fire, but repeated lateral movement does."
            ),
            "cond": new_conditions_4648,
            "supp": 3600,
        },
    )
    print(f"[036] Event 4648 rule: updated {result.rowcount} row(s)")


def downgrade() -> None:
    pass
