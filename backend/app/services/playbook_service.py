"""
Playbook Generator Service — SOAR automation for incident response.

Generation chain (5-level fallback):
  1. Template cache hit       — exact technique match in DB
  2. Tactic fallback          — template matching tactic only
  3. Category fallback        — template matching category only
  4. LLM generation           — structured JSON prompt to Groq/Gemini
  5. Generic 8-step fallback  — always succeeds

Variables substituted into step descriptions:
  {source_ip}, {username}, {device_name}, {device_os}, {incident_id},
  {company_name}, {attempt_count}, {timeframe}, {protocol}, {port},
  {technique_id}, {technique_name}, {cve_id}, {cvss_score}, {timestamp},
  {analyst_note}
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.playbook import (
    Playbook,
    PlaybookRun,
    PlaybookStep,
    PlaybookTemplate,
    PlaybookTemplateStep,
)

logger = structlog.get_logger(__name__)

# ── 16 substitution variables ─────────────────────────────────────────────────
_VARIABLE_DEFAULTS: dict[str, str] = {
    "source_ip":      "Unknown IP",
    "username":       "Unknown User",
    "device_name":    "Unknown Device",
    "device_os":      "Unknown OS",
    "incident_id":    "INC-UNKNOWN",
    "company_name":   "Your Organization",
    "attempt_count":  "multiple",
    "timeframe":      "the last 24 hours",
    "protocol":       "Unknown Protocol",
    "port":           "Unknown Port",
    "technique_id":   "T0000",
    "technique_name": "Unknown Technique",
    "cve_id":         "N/A",
    "cvss_score":     "N/A",
    "timestamp":      datetime.now(tz=timezone.utc).isoformat(),
    "analyst_note":   "[ANALYST: Review and adapt these steps to your environment]",
}

# ── Generic 8-step fallback playbook ─────────────────────────────────────────
_GENERIC_STEPS = [
    {
        "step_order": 1,
        "category": "triage",
        "title": "Triage and Initial Assessment",
        "description_template": (
            "Review the alert for {incident_id} triggered on {device_name} ({source_ip}) "
            "at {timestamp}. Determine urgency, validate the alert is not a false positive, "
            "and assign an initial priority level."
        ),
        "expected_result": "Alert validated and priority assigned.",
        "requires_human_approval": True,
        "is_critical": True,
        "can_run_parallel": False,
    },
    {
        "step_order": 2,
        "category": "investigation",
        "title": "Evidence Collection",
        "description_template": (
            "Collect all available evidence: process logs, network connections, "
            "file system changes, and authentication records on {device_name}. "
            "Preserve memory dumps if malware is suspected."
        ),
        "command_windows": "Get-WinEvent -LogName Security -MaxEvents 500 | Export-Csv evidence.csv",
        "command_linux": "journalctl --since '24 hours ago' > evidence.log && last > logins.log",
        "expected_result": "Evidence package collected and stored securely.",
        "requires_human_approval": False,
        "is_critical": True,
        "can_run_parallel": True,
    },
    {
        "step_order": 3,
        "category": "investigation",
        "title": "Scope Determination",
        "description_template": (
            "Determine the blast radius of the incident. Identify all affected systems, "
            "users ({username}), and data. Check lateral movement indicators."
        ),
        "expected_result": "Affected asset list documented with confidence level.",
        "requires_human_approval": True,
        "is_critical": True,
        "can_run_parallel": False,
    },
    {
        "step_order": 4,
        "category": "containment",
        "title": "Initial Containment",
        "description_template": (
            "Apply immediate containment to limit further damage. "
            "Consider isolating {device_name} from the network if active threat is confirmed. "
            "Block the source IP {source_ip} at the perimeter firewall."
        ),
        "expected_result": "Threat contained — no further lateral spread observed.",
        "requires_human_approval": True,
        "is_critical": True,
        "can_run_parallel": False,
        "action_type": "isolate_device",
    },
    {
        "step_order": 5,
        "category": "investigation",
        "title": "Root Cause Analysis",
        "description_template": (
            "Perform deep investigation to identify the root cause. "
            "Trace the attack path using {technique_id} ({technique_name}) indicators. "
            "Identify the initial access vector and full kill chain."
        ),
        "expected_result": "Root cause identified and documented with full attack chain.",
        "requires_human_approval": True,
        "is_critical": False,
        "can_run_parallel": False,
    },
    {
        "step_order": 6,
        "category": "eradication",
        "title": "Threat Eradication",
        "description_template": (
            "Remove all malicious artifacts from affected systems. "
            "Revoke compromised credentials for {username}. "
            "Patch identified vulnerabilities ({cve_id}, CVSS: {cvss_score})."
        ),
        "command_windows": "Remove-MaliciousArtifacts.ps1 -TargetHost {device_name}",
        "command_linux": "clamscan --remove=yes --recursive /",
        "expected_result": "All malicious artifacts removed and verified clean.",
        "requires_human_approval": True,
        "is_critical": True,
        "can_run_parallel": False,
    },
    {
        "step_order": 7,
        "category": "recovery",
        "title": "Recovery and Verification",
        "description_template": (
            "Restore {device_name} to normal operations from a known-good state. "
            "Verify system integrity, re-enable services, and confirm monitoring is active. "
            "Confirm no re-infection within 48 hours of recovery."
        ),
        "expected_result": "System restored, verified clean, and monitoring active.",
        "requires_human_approval": True,
        "is_critical": True,
        "can_run_parallel": False,
    },
    {
        "step_order": 8,
        "category": "documentation",
        "title": "Documentation and Lessons Learned",
        "description_template": (
            "Document the full incident timeline for {incident_id}. "
            "Update threat intelligence with IOCs from this incident. "
            "Schedule a post-incident review with {company_name} security team within 5 business days. "
            "{analyst_note}"
        ),
        "expected_result": "Incident report completed and distributed to stakeholders.",
        "requires_human_approval": False,
        "is_critical": False,
        "can_run_parallel": False,
    },
]

# ── LLM system prompt ─────────────────────────────────────────────────────────
_LLM_SYSTEM_PROMPT = (
    "You are a senior SOC analyst with 20 years of experience and a MITRE ATT&CK specialist. "
    "You generate detailed, actionable incident response playbooks. "
    "Respond ONLY with valid JSON — no markdown, no explanation, no preamble. "
    "The JSON must be a list of step objects with this exact schema:\n"
    '[\n'
    '  {\n'
    '    "step_order": 1,\n'
    '    "category": "triage|investigation|containment|eradication|recovery|documentation",\n'
    '    "title": "string",\n'
    '    "description_template": "string with {variables}",\n'
    '    "command_windows": "optional PowerShell command or null",\n'
    '    "command_linux": "optional bash command or null",\n'
    '    "expected_result": "string",\n'
    '    "can_run_parallel": false,\n'
    '    "requires_human_approval": true,\n'
    '    "is_critical": false,\n'
    '    "hint": "optional analyst hint or null",\n'
    '    "mitre_reference": "optional technique ID or null",\n'
    '    "action_type": "optional: isolate_device|quarantine_device|revoke_credentials or null",\n'
    '    "step_order_dependencies": []\n'
    '  }\n'
    ']\n'
    "Use these template variables where appropriate: {source_ip}, {username}, {device_name}, "
    "{device_os}, {incident_id}, {company_name}, {attempt_count}, {timeframe}, {protocol}, "
    "{port}, {technique_id}, {technique_name}, {cve_id}, {cvss_score}, {timestamp}, {analyst_note}. "
    "Generate 6-10 comprehensive steps."
)


class PlaybookGeneratorService:

    @staticmethod
    async def generate_incident_id(db: AsyncSession, tenant_id: UUID) -> str:
        today = datetime.now(tz=timezone.utc).strftime("%Y%m%d")
        prefix = f"INC-{today}-"
        result = await db.execute(
            select(func.count()).where(
                Playbook.tenant_id == tenant_id,
                Playbook.incident_id.like(f"{prefix}%"),
                Playbook.deleted_at.is_(None),
            )
        )
        count = (result.scalar_one() or 0) + 1
        return f"{prefix}{count:04d}"

    @staticmethod
    def _extract_variables(
        alert_title: str,
        severity: str,
        source_host: str | None,
        mitre_techniques: list[str],
        evidence: dict[str, Any],
        incident_id: str,
        company_name: str,
    ) -> dict[str, str]:
        vars_: dict[str, str] = dict(_VARIABLE_DEFAULTS)
        vars_["incident_id"] = incident_id
        vars_["company_name"] = company_name
        vars_["timestamp"] = datetime.now(tz=timezone.utc).isoformat()
        if source_host:
            vars_["device_name"] = source_host
        # Flatten evidence fields
        for key, field in [
            ("source_ip", "source_ip"),
            ("username", "username"),
            ("device_os", "os_type"),
            ("attempt_count", "attempt_count"),
            ("protocol", "protocol"),
            ("port", "port"),
            ("cve_id", "cve_id"),
            ("cvss_score", "cvss_score"),
        ]:
            v = evidence.get(field) or evidence.get(key)
            if v is not None:
                vars_[key] = str(v)
        if mitre_techniques:
            first = str(mitre_techniques[0])
            vars_["technique_id"] = first
            vars_["technique_name"] = _technique_name(first)
        return vars_

    @staticmethod
    def _substitute(template: str | None, variables: dict[str, str]) -> str | None:
        if template is None:
            return None
        result = template
        for key, value in variables.items():
            result = result.replace(f"{{{key}}}", str(value))
        return result

    @classmethod
    async def generate(
        cls,
        db: AsyncSession,
        tenant_id: UUID,
        alert_id: UUID | None,
        alert_title: str,
        severity: str,
        source_host: str | None,
        mitre_techniques: list[str],
        mitre_tactics: list[str],
        evidence: dict[str, Any],
        company_name: str,
        investigation_id: UUID | None = None,
        created_by_id: UUID | None = None,
    ) -> Playbook:
        incident_id = await cls.generate_incident_id(db, tenant_id)
        variables = cls._extract_variables(
            alert_title=alert_title,
            severity=severity,
            source_host=source_host,
            mitre_techniques=mitre_techniques,
            evidence=evidence,
            incident_id=incident_id,
            company_name=company_name,
        )

        # Determine primary technique/tactic/category for template lookup
        primary_technique = mitre_techniques[0] if mitre_techniques else None
        primary_tactic = mitre_tactics[0] if mitre_tactics else None
        category = _infer_category(primary_technique, primary_tactic, alert_title)

        # ── Fallback chain ────────────────────────────────────────────────────
        template_steps, generated_by, template_id = await cls._resolve_steps(
            db=db,
            tenant_id=tenant_id,
            technique=primary_technique,
            tactic=primary_tactic,
            category=category,
            variables=variables,
            alert_title=alert_title,
            severity=severity,
            source_host=source_host,
        )

        # ── Persist playbook ──────────────────────────────────────────────────
        playbook = Playbook(
            tenant_id=tenant_id,
            template_id=template_id,
            alert_id=alert_id,
            investigation_id=investigation_id,
            incident_id=incident_id,
            title=f"[{severity.upper()}] {alert_title}",
            severity=severity,
            source_host=source_host,
            status="pending",
            variables=variables,
            generated_by=generated_by,
            created_by_id=created_by_id,
        )
        db.add(playbook)
        await db.flush()

        for raw_step in template_steps:
            step = PlaybookStep(
                playbook_id=playbook.id,
                step_order=raw_step["step_order"],
                category=raw_step.get("category", "investigation"),
                title=raw_step["title"],
                description=cls._substitute(raw_step.get("description_template"), variables),
                command_windows=cls._substitute(raw_step.get("command_windows"), variables),
                command_linux=cls._substitute(raw_step.get("command_linux"), variables),
                expected_result=cls._substitute(raw_step.get("expected_result"), variables),
                requires_human_approval=raw_step.get("requires_human_approval", True),
                is_critical=raw_step.get("is_critical", False),
                can_run_parallel=raw_step.get("can_run_parallel", False),
                action_type=raw_step.get("action_type"),
            )
            db.add(step)

        logger.info(
            "playbook_generated",
            playbook_id=str(playbook.id),
            incident_id=incident_id,
            generated_by=generated_by,
            steps=len(template_steps),
        )
        return playbook

    @classmethod
    async def _resolve_steps(
        cls,
        db: AsyncSession,
        tenant_id: UUID,
        technique: str | None,
        tactic: str | None,
        category: str | None,
        variables: dict[str, str],
        alert_title: str,
        severity: str,
        source_host: str | None,
    ) -> tuple[list[dict[str, Any]], str, UUID | None]:

        # Level 1: exact technique match (system or tenant templates)
        if technique:
            steps, tmpl_id = await cls._load_template_steps(
                db, tenant_id, technique=technique
            )
            if steps:
                return steps, "template", tmpl_id

        # Level 2: tactic match
        if tactic:
            steps, tmpl_id = await cls._load_template_steps(
                db, tenant_id, tactic=tactic
            )
            if steps:
                return steps, "template_tactic", tmpl_id

        # Level 3: category match
        if category:
            steps, tmpl_id = await cls._load_template_steps(
                db, tenant_id, category=category
            )
            if steps:
                return steps, "template_category", tmpl_id

        # Level 4: LLM generation
        try:
            llm_steps = await cls._generate_with_llm(
                technique=technique,
                tactic=tactic,
                alert_title=alert_title,
                severity=severity,
                source_host=source_host,
                variables=variables,
            )
            if llm_steps:
                return llm_steps, "llm", None
        except Exception:
            logger.warning("playbook_llm_generation_failed", exc_info=True)

        # Level 5: generic fallback
        return list(_GENERIC_STEPS), "fallback", None

    @staticmethod
    async def _load_template_steps(
        db: AsyncSession,
        tenant_id: UUID,
        technique: str | None = None,
        tactic: str | None = None,
        category: str | None = None,
    ) -> tuple[list[dict[str, Any]], UUID | None]:
        query = (
            select(PlaybookTemplate)
            .where(
                PlaybookTemplate.enabled.is_(True),
                PlaybookTemplate.deleted_at.is_(None),
                (PlaybookTemplate.tenant_id == tenant_id) | (PlaybookTemplate.is_system.is_(True)),
            )
        )
        if technique:
            query = query.where(PlaybookTemplate.technique == technique)
        elif tactic:
            query = query.where(PlaybookTemplate.tactic == tactic)
        elif category:
            query = query.where(PlaybookTemplate.category == category)
        else:
            return [], None

        # Tenant-specific templates take precedence over system templates
        query = query.order_by(
            PlaybookTemplate.is_system.asc(),
            PlaybookTemplate.created_at.desc(),
        ).limit(1)

        result = await db.execute(query)
        template = result.scalar_one_or_none()
        if template is None:
            return [], None

        step_result = await db.execute(
            select(PlaybookTemplateStep)
            .where(PlaybookTemplateStep.template_id == template.id)
            .order_by(PlaybookTemplateStep.step_order)
        )
        steps_orm = list(step_result.scalars().all())
        steps = [
            {
                "step_order": s.step_order,
                "category": s.category,
                "title": s.title,
                "description_template": s.description_template,
                "command_windows": s.command_windows,
                "command_linux": s.command_linux,
                "expected_result": s.expected_result,
                "can_run_parallel": s.can_run_parallel,
                "requires_human_approval": s.requires_human_approval,
                "is_critical": s.is_critical,
                "hint": s.hint,
                "mitre_reference": s.mitre_reference,
                "action_type": s.action_type,
                "step_order_dependencies": s.step_order_dependencies,
            }
            for s in steps_orm
        ]
        return steps, template.id

    @staticmethod
    async def _generate_with_llm(
        technique: str | None,
        tactic: str | None,
        alert_title: str,
        severity: str,
        source_host: str | None,
        variables: dict[str, str],
    ) -> list[dict[str, Any]]:
        from app.ai.llm_manager import get_llm_manager
        llm = get_llm_manager()

        prompt = (
            f"Generate a comprehensive incident response playbook for the following security alert:\n\n"
            f"Alert Title: {alert_title}\n"
            f"Severity: {severity.upper()}\n"
            f"Affected Host: {source_host or 'Unknown'}\n"
            f"MITRE Technique: {technique or 'Unknown'} ({_technique_name(technique or '')})\n"
            f"MITRE Tactic: {tactic or 'Unknown'}\n\n"
            f"Context variables available for substitution:\n"
            + "\n".join(f"  {{{k}}}: {v}" for k, v in variables.items())
            + "\n\nRespond ONLY with the JSON array of steps."
        )

        raw = await llm.generate(prompt, system_prompt=_LLM_SYSTEM_PROMPT, max_tokens=3000)

        # Strip any markdown code fences if the model added them
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

        steps: list[dict[str, Any]] = json.loads(raw)
        if not isinstance(steps, list) or len(steps) == 0:
            raise ValueError("LLM returned empty or non-list response")

        # Ensure required fields
        for i, step in enumerate(steps, 1):
            step.setdefault("step_order", i)
            step.setdefault("category", "investigation")
            step.setdefault("requires_human_approval", True)
            step.setdefault("is_critical", False)
            step.setdefault("can_run_parallel", False)
            step.setdefault("step_order_dependencies", [])

        return steps

    @staticmethod
    async def execute_playbook(
        db: AsyncSession,
        tenant_id: UUID,
        playbook_id: UUID,
        actor_id: UUID | None,
        mode: str = "manual",
    ) -> PlaybookRun:
        result = await db.execute(
            select(Playbook).where(
                Playbook.id == playbook_id,
                Playbook.tenant_id == tenant_id,
                Playbook.deleted_at.is_(None),
            )
        )
        playbook = result.scalar_one_or_none()
        if playbook is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(f"Playbook {playbook_id} not found")

        step_count_result = await db.execute(
            select(func.count()).where(PlaybookStep.playbook_id == playbook_id)
        )
        steps_total = step_count_result.scalar_one()

        playbook.status = "in_progress"
        run = PlaybookRun(
            playbook_id=playbook_id,
            tenant_id=tenant_id,
            mode=mode,
            status="running",
            steps_total=steps_total,
            actor_id=actor_id,
        )
        db.add(run)
        await db.flush()
        return run

    @staticmethod
    async def complete_step(
        db: AsyncSession,
        tenant_id: UUID,
        playbook_id: UUID,
        step_id: UUID,
        actor_id: UUID,
        notes: str | None = None,
        result_text: str | None = None,
    ) -> PlaybookStep:
        # Verify playbook belongs to tenant
        pb_result = await db.execute(
            select(Playbook).where(
                Playbook.id == playbook_id,
                Playbook.tenant_id == tenant_id,
                Playbook.deleted_at.is_(None),
            )
        )
        if pb_result.scalar_one_or_none() is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(f"Playbook {playbook_id} not found")

        step_result = await db.execute(
            select(PlaybookStep).where(
                PlaybookStep.id == step_id,
                PlaybookStep.playbook_id == playbook_id,
            )
        )
        step = step_result.scalar_one_or_none()
        if step is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(f"Step {step_id} not found")

        step.status = "completed"
        step.completed_at = datetime.now(tz=timezone.utc)
        step.completed_by_id = actor_id
        if notes:
            step.notes = notes
        if result_text:
            step.result = result_text

        # Check if all steps are done → update playbook status
        total_result = await db.execute(
            select(func.count()).where(PlaybookStep.playbook_id == playbook_id)
        )
        done_result = await db.execute(
            select(func.count()).where(
                PlaybookStep.playbook_id == playbook_id,
                PlaybookStep.status.in_(["completed", "skipped"]),
            )
        )
        total = total_result.scalar_one()
        done = done_result.scalar_one()
        if done >= total:
            pb_update = await db.execute(
                select(Playbook).where(Playbook.id == playbook_id)
            )
            pb = pb_update.scalar_one_or_none()
            if pb:
                pb.status = "completed"

        await db.flush()
        return step


# ── Helpers ───────────────────────────────────────────────────────────────────

_TECHNIQUE_NAMES: dict[str, str] = {
    "T1059": "Command and Scripting Interpreter",
    "T1055": "Process Injection",
    "T1003": "OS Credential Dumping",
    "T1078": "Valid Accounts",
    "T1021": "Remote Services",
    "T1047": "Windows Management Instrumentation",
    "T1053": "Scheduled Task/Job",
    "T1071": "Application Layer Protocol",
    "T1041": "Exfiltration Over C2 Channel",
    "T1566": "Phishing",
    "T1486": "Data Encrypted for Impact",
    "T1190": "Exploit Public-Facing Application",
    "T1133": "External Remote Services",
    "T1110": "Brute Force",
    "T1040": "Network Sniffing",
}


def _technique_name(technique_id: str) -> str:
    base = technique_id.split(".")[0].upper()
    return _TECHNIQUE_NAMES.get(base, "Unknown Technique")


_CATEGORY_MAP: dict[str, str] = {
    "T1486": "ransomware",
    "T1003": "credential_theft",
    "T1110": "credential_theft",
    "T1078": "credential_theft",
    "T1071": "beaconing",
    "T1041": "beaconing",
    "T1055": "privilege_escalation",
    "T1021": "lateral_movement",
    "T1047": "lateral_movement",
}


def _infer_category(
    technique: str | None, tactic: str | None, title: str
) -> str | None:
    if technique:
        base = technique.split(".")[0].upper()
        cat = _CATEGORY_MAP.get(base)
        if cat:
            return cat
    title_lower = title.lower()
    if "ransomware" in title_lower or "encrypt" in title_lower:
        return "ransomware"
    if "credential" in title_lower or "password" in title_lower or "brute" in title_lower:
        return "credential_theft"
    if "beacon" in title_lower or "c2" in title_lower or "command and control" in title_lower:
        return "beaconing"
    if "lateral" in title_lower or "remote" in title_lower:
        return "lateral_movement"
    if "privilege" in title_lower or "escalation" in title_lower:
        return "privilege_escalation"
    return None
