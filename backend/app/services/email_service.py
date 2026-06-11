"""
Email service — sends invitation emails via SMTP.
Falls back to log-only mode when SMTP is not configured.
Never raises — email failure must not block the invite flow.
"""
from __future__ import annotations

import structlog

log = structlog.get_logger(__name__)


async def send_invitation_email(
    to_email: str,
    invited_by_name: str,
    tenant_name: str,
    accept_url: str,
    expires_hours: int = 48,
) -> bool:
    """
    Send an invitation email. Returns True on success, False on failure.
    """
    from app.core.config import settings

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
            log.info("invitation_email_sent", to=to_email)
            return True
        except Exception as exc:
            log.warning("invitation_email_smtp_failed", to=to_email, error=str(exc))

    # Fallback: log the accept link (dev mode / no SMTP configured)
    log.info(
        "invitation_email_fallback_log",
        to=to_email,
        accept_url=accept_url,
        note="Configure SMTP_HOST/SMTP_USER/SMTP_PASSWORD in .env to send real emails",
    )
    return False
