"""detection_rule_fp_reduction: tighten overly broad built-in rules to reduce false positives

Revision ID: 035
Revises: 034
Create Date: 2026-06-27

Fixes six built-in detection rules that fire on normal Windows workstation activity:

1. LSASS Access — was "any command_line containing lsass" (CRITICAL); narrowed to
   procdump-targeting-lsass, rundll32 comsvcs MiniDump, and Mimikatz dump flags.

2. Windows Script Host (wscript/cscript) — was "any execution" (MEDIUM); now requires
   the script path to be in a user-writable location or the command to contain a URL/
   download pattern.

3. System Enumeration (whoami/systeminfo) — severity MEDIUM → LOW; suppression 600 → 3600s.
   These tools are legitimately used by admins and monitoring scripts.

4. Scheduled Task Created (Event 4698) — severity HIGH → MEDIUM; suppression 600 → 3600s;
   added exclusion for SOCAnalystAgent (our own bootstrap task), GoogleUpdate,
   MicrosoftEdgeUpdate, and OneDrive which fire on every agent enrollment/update.

5. PowerShell Script Block (Event 4104) — was "any 4104 event" (MEDIUM); now requires
   the logged script block to contain suspicious content (encoded commands, AMSI bypass,
   download cradles, credential-dumping strings, or raw socket patterns).

6. Linux Cron — was "any cron execution" (LOW / 3600s); renamed and narrowed to require
   the cron command to contain network download patterns, pipe-to-shell, or base64 decode.
"""

from __future__ import annotations

import json
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


# ── New rule specifications (name → patch dict) ───────────────────────────────

_RULE_PATCHES: list[dict] = [
    # 1. LSASS Access
    {
        "name": "LSASS Access - Credential Dump Attempt",
        "new_description": (
            "Detects processes targeting lsass.exe for credential dumping — "
            "specifically procdump, rundll32 comsvcs MiniDump, or direct handle open. "
            "Requires suspicious dump-specific arguments to avoid false positives from "
            "diagnostic tools (Task Manager, Process Explorer) that legitimately reference lsass."
        ),
        "new_conditions": {
            "op": "any_of",
            "conditions": [
                {
                    "op": "any_of_groups",
                    "groups": [
                        [
                            {"field": "process.name", "op": "eq", "value": "procdump.exe"},
                            {"field": "process.command_line", "op": "contains", "value": "lsass"},
                        ],
                        [
                            {"field": "process.name", "op": "eq", "value": "procdump64.exe"},
                            {"field": "process.command_line", "op": "contains", "value": "lsass"},
                        ],
                    ],
                },
                {
                    "op": "any_of_groups",
                    "groups": [
                        [
                            {"field": "process.command_line", "op": "contains", "value": "comsvcs"},
                            {"field": "process.command_line", "op": "contains", "value": "MiniDump"},
                        ],
                    ],
                },
                {
                    "op": "any_of_groups",
                    "groups": [
                        [
                            {"field": "process.command_line", "op": "regex",
                             "value": r"lsass.*-ma\b|lsass.*-dump|\blsass\.exe.*\s+-"},
                        ],
                    ],
                },
            ],
        },
        "new_severity": None,  # keep CRITICAL
        "new_suppression": None,  # keep 300
    },

    # 2. Windows Script Host
    {
        "name": "Windows Script Host (wscript / cscript) Execution",
        "new_description": (
            "wscript.exe or cscript.exe running a script from a user-writable or "
            "suspicious location (Temp, AppData, Downloads, Desktop, Public). "
            "Scripts from System32 or Program Files are excluded to avoid false "
            "positives from legitimate Windows administration and printer drivers."
        ),
        "new_conditions": [
            {"field": "process.name", "op": "in", "value": ["wscript.exe", "cscript.exe"]},
            {
                "op": "any_of",
                "conditions": [
                    {"field": "process.command_line", "op": "regex",
                     "value": r"\\Temp\\|\\AppData\\Local\\Temp\\|\\Downloads\\|\\Desktop\\|\\Users\\Public\\"},
                    {"field": "process.command_line", "op": "regex",
                     "value": r"https?://|\\\\[0-9]{1,3}\.[0-9]{1,3}\."},
                    {"field": "process.command_line", "op": "regex",
                     "value": r"\.vbs\s+-e\s+|-e\s+[A-Za-z0-9+/]{20,}"},
                ],
            },
        ],
        "new_severity": None,
        "new_suppression": None,
    },

    # 3. System Enumeration - whoami
    {
        "name": "System Enumeration - whoami / systeminfo",
        "new_description": (
            "whoami or systeminfo executed — attackers run these immediately after "
            "gaining access to understand their privilege level and environment. "
            "Low severity / long suppression because admins and monitoring scripts "
            "legitimately run these tools; elevate manually if seen alongside other "
            "discovery or lateral movement indicators."
        ),
        "new_conditions": None,  # keep same conditions
        "new_severity": "low",
        "new_suppression": 3600,
    },

    # 4. Scheduled Task Created
    {
        "name": "Scheduled Task Created (Event 4698)",
        "new_description": (
            "A new scheduled task was registered.  Scheduled tasks are the most "
            "common Windows persistence mechanism used by attackers. "
            "The SOCAnalystAgent task created by bootstrap enrollment is excluded "
            "to avoid a false positive on every new agent installation."
        ),
        "new_conditions": [
            {"field": "raw.windows_event_id", "op": "eq", "value": "4698"},
            {
                "op": "none_of",
                "conditions": [
                    {"field": "raw.message", "op": "contains", "value": "SOCAnalystAgent"},
                    {"field": "raw.message", "op": "contains", "value": "GoogleUpdate"},
                    {"field": "raw.message", "op": "contains", "value": "MicrosoftEdgeUpdate"},
                    {"field": "raw.message", "op": "contains", "value": "OneDrive"},
                ],
            },
        ],
        "new_severity": "medium",
        "new_suppression": 3600,
    },

    # 5. PowerShell Script Block (Event 4104)
    {
        "name": "PowerShell Script Block Logging - Execution Captured (Event 4104)",
        "new_description": (
            "PowerShell script block logging (Event 4104) captured a script containing "
            "suspicious indicators: encoded commands, AMSI bypass strings, download cradles, "
            "or credential access patterns. Bare 4104 events without suspicious content "
            "are excluded to avoid alerting on every legitimate admin script."
        ),
        "new_conditions": [
            {"field": "raw.windows_event_id", "op": "eq", "value": "4104"},
            {
                "op": "any_of",
                "conditions": [
                    {"field": "raw.message", "op": "regex",
                     "value": r"-enc[a-z]*\s+[A-Za-z0-9+/]{20,}|-[Ee]ncodedCommand"},
                    {"field": "raw.message", "op": "regex",
                     "value": r"amsiInitFailed|AmsiScanBuffer|amsiContext|DisableScriptBlockLogging"},
                    {"field": "raw.message", "op": "regex",
                     "value": r"DownloadString|DownloadFile|Invoke-WebRequest|Start-BitsTransfer"},
                    {"field": "raw.message", "op": "regex",
                     "value": r"sekurlsa|lsadump|kerberos::ptt|Invoke-Mimikatz"},
                    {"field": "raw.message", "op": "regex",
                     "value": r"TCPClient|Net\.Sockets|NetworkStream|StreamReader.*\d{1,3}\.\d{1,3}"},
                ],
            },
        ],
        "new_severity": None,
        "new_suppression": None,
    },

    # 6. Linux Cron
    {
        "name": "Linux Cron Job Execution Detected",
        "new_name": "Linux Cron Job - Suspicious Command Detected",
        "new_description": (
            "Cron executed a command containing network downloads, pipe-to-shell "
            "patterns, or references to temporary paths — indicators of malicious "
            "cron persistence. Normal cron jobs (backups, log rotation) are excluded."
        ),
        "new_conditions": [
            {"field": "category", "op": "eq", "value": "process"},
            {"field": "raw.program", "op": "in", "value": ["cron", "crond"]},
            {
                "op": "any_of",
                "conditions": [
                    {"field": "raw.message", "op": "regex",
                     "value": r"curl\s+|wget\s+|python\s+-c|bash\s+-i|nc\s+-|/tmp/|/dev/tcp"},
                    {"field": "raw.message", "op": "regex",
                     "value": r"\|\s*bash|\|\s*sh|\|\s*python"},
                    {"field": "raw.message", "op": "regex",
                     "value": r"base64\s+--decode|base64\s+-d\b|echo.*\|\s*sh"},
                ],
            },
        ],
        "new_severity": "medium",
        "new_suppression": None,
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    for patch in _RULE_PATCHES:
        old_name = patch["name"]
        new_name = patch.get("new_name", old_name)

        set_clauses = []
        params: dict = {"old_name": old_name}

        set_clauses.append("name = :new_name")
        params["new_name"] = new_name

        if patch.get("new_description"):
            set_clauses.append("description = :new_description")
            params["new_description"] = patch["new_description"]

        if patch.get("new_conditions") is not None:
            set_clauses.append("conditions = CAST(:new_conditions AS jsonb)")
            params["new_conditions"] = json.dumps(patch["new_conditions"])

        if patch.get("new_severity") is not None:
            set_clauses.append("severity = :new_severity")
            params["new_severity"] = patch["new_severity"]

        if patch.get("new_suppression") is not None:
            set_clauses.append("suppression_window_secs = :new_suppression")
            params["new_suppression"] = patch["new_suppression"]

        if not set_clauses:
            continue

        sql = f"UPDATE detection_rules SET {', '.join(set_clauses)} WHERE name = :old_name"
        result = conn.execute(text(sql), params)
        if result.rowcount == 0:
            print(f"[035] WARNING: rule not found: '{old_name}' — skipping")
        else:
            print(f"[035] Updated {result.rowcount} row(s) for rule: '{old_name}'")


def downgrade() -> None:
    # Reverting to the noisy broad rules is intentionally not implemented —
    # the original rules are preserved in git history if needed.
    pass
