"""
Email service — SMTP with fallback to log-only mode.
Never raises — email failure must never block business logic.
"""
from __future__ import annotations

import structlog
from app.core.config import get_settings

log = structlog.get_logger(__name__)


# ─── Internal SMTP helper ─────────────────────────────────────────────────────

async def _send_email(to_email: str, subject: str, body: str) -> bool:
    """Try SMTP; fall back to logging the content. Returns True on success."""
    settings = get_settings()

    if settings.SMTP_HOST and settings.SMTP_USER:
        try:
            import aiosmtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
            msg["To"]      = to_email
            msg.attach(MIMEText(body, "plain"))

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=settings.SMTP_PORT == 465,
                start_tls=settings.SMTP_PORT == 587,
                timeout=10,
            )
            log.info("email_sent", to=to_email, subject=subject[:60])
            return True
        except Exception as exc:
            log.warning("email_smtp_failed", to=to_email, error=str(exc))

    log.info(
        "email_fallback_log",
        to=to_email,
        subject=subject,
        note="Configure SMTP_HOST/SMTP_USER/SMTP_PASSWORD to send real emails",
    )
    return False


# ─── Public email functions ───────────────────────────────────────────────────

async def send_invitation_email(
    to_email: str,
    invited_by_name: str,
    tenant_name: str,
    accept_url: str,
    expires_hours: int = 48,
) -> bool:
    """Send a workspace invitation email."""
    subject = f"You're invited to join {tenant_name} on NEURASHIELD"
    body = f"""Hi there,

{invited_by_name} has invited you to join {tenant_name} on NEURASHIELD SOC Platform.

Click the link below to accept your invitation:
{accept_url}

This invitation expires in {expires_hours} hours.

If you don't have an account, you'll be able to create one after clicking the link.
If you already have an account, you'll be asked to log in.

-- NEURASHIELD Team
"""
    return await _send_email(to_email=to_email, subject=subject, body=body)


async def send_alert_email(
    to_email: str,
    recipient_name: str,
    alert_title: str,
    severity: str,
    source_host: str | None,
    mitre_technique: str | None,
    recommended_action: str | None,
    alert_url: str,
) -> bool:
    """Send email when a HIGH/CRITICAL alert fires."""
    severity_upper = severity.upper()
    emoji = "🔴" if severity_upper == "CRITICAL" else "🟠"

    subject = f"{emoji} [{severity_upper}] Security Alert: {alert_title}"
    body = f"""Hi {recipient_name},

A {severity_upper} security alert has been triggered on NEURASHIELD.

Alert: {alert_title}
Severity: {severity_upper}
Host: {source_host or "Unknown"}
{f"MITRE Technique: {mitre_technique}" if mitre_technique else ""}
{f"Recommended Action: {recommended_action}" if recommended_action else ""}

View and respond to this alert:
{alert_url}

-- NEURASHIELD SOC Platform
"""
    return await _send_email(to_email=to_email, subject=subject, body=body)


async def send_agent_offline_email(
    to_email: str,
    recipient_name: str,
    hostname: str,
    last_seen: str,
    agents_url: str,
) -> bool:
    """Send email when an agent goes offline."""
    subject = f"Agent Offline: {hostname}"
    body = f"""Hi {recipient_name},

A monitored device has gone offline on NEURASHIELD.

Hostname: {hostname}
Last Seen: {last_seen}

This may indicate: network connectivity issue, system shutdown,
or agent process termination.

View agent status:
{agents_url}

-- NEURASHIELD SOC Platform
"""
    return await _send_email(to_email=to_email, subject=subject, body=body)


async def send_investigation_email(
    to_email: str,
    recipient_name: str,
    investigation_title: str,
    threat_score: int,
    verdict_suggestion: str | None,
    investigation_url: str,
) -> bool:
    """Send email when a new investigation is created."""
    subject = f"New Investigation: {investigation_title}"
    verdict_text = ""
    if verdict_suggestion:
        verdict_map = {
            "true_positive":       "Likely True Positive",
            "false_positive":      "Likely False Positive",
            "needs_investigation": "Needs Investigation",
        }
        verdict_text = f"\nAI Verdict: {verdict_map.get(verdict_suggestion, verdict_suggestion)}"

    body = f"""Hi {recipient_name},

A new security investigation has been created on NEURASHIELD.

Investigation: {investigation_title}
Threat Score: {threat_score}/100{verdict_text}

Review the full investigation:
{investigation_url}

-- NEURASHIELD SOC Platform
"""
    return await _send_email(to_email=to_email, subject=subject, body=body)
