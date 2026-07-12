from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.rbac.permissions import Permission
from app.schemas.common import APIResponse

router = APIRouter(prefix="/settings", tags=["Settings"])

_THRESHOLDS_KEY = "severity_thresholds"
_SMTP_KEY = "smtp_config"


class SeverityThresholds(BaseModel):
    critical_min_score: int = Field(default=80, ge=0, le=100)
    high_min_score: int = Field(default=60, ge=0, le=100)
    medium_min_score: int = Field(default=30, ge=0, le=100)
    low_min_score: int = Field(default=0, ge=0, le=100)
    escalate_after_minutes: int = Field(default=60, ge=1)
    auto_close_after_days: int = Field(default=30, ge=1)


@router.get(
    "/severity-thresholds",
    response_model=APIResponse[SeverityThresholds],
    summary="Get tenant severity threshold configuration",
)
async def get_severity_thresholds(
    member: Annotated[object, require_permission(Permission.TENANT_SETTINGS)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[SeverityThresholds]:
    from app.models.tenant import Tenant
    from app.models.tenant_member import TenantMember

    m: TenantMember = member  # type: ignore[assignment]
    tenant = await db.get(Tenant, m.tenant_id)
    raw: dict = (tenant.settings_json or {}).get(_THRESHOLDS_KEY, {}) if tenant else {}
    return APIResponse.ok(SeverityThresholds(**raw))


@router.put(
    "/severity-thresholds",
    response_model=APIResponse[SeverityThresholds],
    summary="Update tenant severity threshold configuration",
)
async def put_severity_thresholds(
    payload: SeverityThresholds,
    member: Annotated[object, require_permission(Permission.TENANT_SETTINGS)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[SeverityThresholds]:
    from app.models.tenant import Tenant
    from app.models.tenant_member import TenantMember

    m: TenantMember = member  # type: ignore[assignment]
    tenant = await db.get(Tenant, m.tenant_id)
    if tenant is not None:
        merged = {**(tenant.settings_json or {}), _THRESHOLDS_KEY: payload.model_dump()}
        await db.execute(
            update(Tenant).where(Tenant.id == m.tenant_id).values(settings_json=merged)
        )
        await db.commit()
    return APIResponse.ok(payload)


# ─── Email / SMTP configuration ───────────────────────────────────────────────


class SmtpConfigPayload(BaseModel):
    host: str = Field(..., min_length=1, max_length=253)
    port: int = Field(default=465, ge=1, le=65535)
    username: str = Field(..., min_length=1)
    password: str = Field(default="", description="Plain-text; stored encrypted")
    from_email: str = Field(default="")
    use_tls: bool = Field(default=True)


class SmtpConfigResponse(BaseModel):
    host: str
    port: int
    username: str
    from_email: str
    use_tls: bool
    is_configured: bool
    password_set: bool


class TestEmailPayload(BaseModel):
    to_email: str = Field(..., min_length=1)


class TestEmailResponse(BaseModel):
    success: bool
    message: str


@router.get(
    "/email",
    response_model=APIResponse[SmtpConfigResponse],
    summary="Get tenant SMTP email configuration",
)
async def get_email_config(
    member: Annotated[object, require_permission(Permission.TENANT_SETTINGS)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[SmtpConfigResponse]:
    from app.models.tenant import Tenant
    from app.models.tenant_member import TenantMember

    m: TenantMember = member  # type: ignore[assignment]
    tenant = await db.get(Tenant, m.tenant_id)
    raw: dict = (tenant.settings_json or {}).get(_SMTP_KEY, {}) if tenant else {}
    return APIResponse.ok(SmtpConfigResponse(
        host=raw.get("host", ""),
        port=raw.get("port", 465),
        username=raw.get("username", ""),
        from_email=raw.get("from_email", ""),
        use_tls=raw.get("use_tls", True),
        is_configured=bool(raw.get("host") and raw.get("username")),
        password_set=bool(raw.get("password_enc")),
    ))


@router.put(
    "/email",
    response_model=APIResponse[SmtpConfigResponse],
    summary="Save tenant SMTP email configuration",
)
async def put_email_config(
    payload: SmtpConfigPayload,
    member: Annotated[object, require_permission(Permission.TENANT_SETTINGS)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[SmtpConfigResponse]:
    from app.models.tenant import Tenant
    from app.models.tenant_member import TenantMember
    from app.services.email_service import encrypt_smtp_password

    m: TenantMember = member  # type: ignore[assignment]
    tenant = await db.get(Tenant, m.tenant_id)
    if tenant is None:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Tenant not found")

    existing: dict = (tenant.settings_json or {}).get(_SMTP_KEY, {})
    smtp_entry: dict = {
        "host": payload.host,
        "port": payload.port,
        "username": payload.username,
        "from_email": payload.from_email or payload.username,
        "use_tls": payload.use_tls,
        "password_enc": encrypt_smtp_password(payload.password) if payload.password
                        else existing.get("password_enc", ""),
    }
    merged = {**(tenant.settings_json or {}), _SMTP_KEY: smtp_entry}
    await db.execute(
        update(Tenant).where(Tenant.id == m.tenant_id).values(settings_json=merged)
    )
    await db.commit()
    return APIResponse.ok(SmtpConfigResponse(
        host=smtp_entry["host"],
        port=smtp_entry["port"],
        username=smtp_entry["username"],
        from_email=smtp_entry["from_email"],
        use_tls=smtp_entry["use_tls"],
        is_configured=True,
        password_set=bool(smtp_entry.get("password_enc")),
    ))


@router.post(
    "/email/test",
    response_model=APIResponse[TestEmailResponse],
    summary="Send a test email using current SMTP configuration",
)
async def test_email_config(
    payload: TestEmailPayload,
    member: Annotated[object, require_permission(Permission.TENANT_SETTINGS)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[TestEmailResponse]:
    from app.models.tenant import Tenant
    from app.models.tenant_member import TenantMember
    from app.services.email_service import decrypt_smtp_password, send_test_email

    m: TenantMember = member  # type: ignore[assignment]
    tenant = await db.get(Tenant, m.tenant_id)
    raw: dict = (tenant.settings_json or {}).get(_SMTP_KEY, {}) if tenant else {}

    if not raw.get("host") or not raw.get("username"):
        return APIResponse.ok(TestEmailResponse(
            success=False,
            message="SMTP not configured — save your settings first",
        ))

    smtp_config = {
        "host": raw["host"],
        "port": raw.get("port", 465),
        "user": raw["username"],
        "from_email": raw.get("from_email", raw["username"]),
        "password": decrypt_smtp_password(raw.get("password_enc", "")) or "",
    }
    success, error = await send_test_email(payload.to_email, smtp_config)
    return APIResponse.ok(TestEmailResponse(
        success=success,
        message="Test email sent — check your inbox" if success else error,
    ))


class QuotaResponse(BaseModel):
    plan: str
    ingestion_rate_eps: float
    ingestion_limit_eps: int
    agents_active: int
    agents_total: int
    members_active: int
    storage_used_gb: float
    storage_limit_gb: int
    renewal_date: str


@router.get(
    "/quota",
    response_model=APIResponse[QuotaResponse],
    summary="Current tenant quota and usage statistics",
)
async def get_quota(
    member: Annotated[object, require_permission(Permission.TENANT_SETTINGS)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> APIResponse[QuotaResponse]:
    from app.models.agent import Agent
    from app.models.event import Event
    from app.models.tenant_member import TenantMember

    m: TenantMember = member  # type: ignore[assignment]
    tenant_id = m.tenant_id

    agents_total = (
        await db.scalar(
            select(func.count(Agent.id)).where(
                Agent.tenant_id == tenant_id,
                Agent.deleted_at.is_(None),
            )
        )
        or 0
    )
    agents_active = (
        await db.scalar(
            select(func.count(Agent.id)).where(
                Agent.tenant_id == tenant_id,
                Agent.deleted_at.is_(None),
                Agent.status == "online",
            )
        )
        or 0
    )
    members_active = (
        await db.scalar(
            select(func.count(TenantMember.id)).where(
                TenantMember.tenant_id == tenant_id,
            )
        )
        or 0
    )
    # Estimate storage from event count (avg ~2 KB per event)
    event_count = (
        await db.scalar(select(func.count(Event.id)).where(Event.tenant_id == tenant_id)) or 0
    )
    storage_used_gb = round((event_count * 2048) / (1024**3), 2)

    # Renewal date = 1st of the following month
    now = datetime.now(UTC)
    if now.month == 12:
        renewal = now.replace(year=now.year + 1, month=1, day=1)
    else:
        renewal = now.replace(month=now.month + 1, day=1)

    return APIResponse.ok(
        QuotaResponse(
            plan="enterprise",
            ingestion_rate_eps=0.0,
            ingestion_limit_eps=10_000,
            agents_active=agents_active,
            agents_total=agents_total,
            members_active=members_active,
            storage_used_gb=storage_used_gb,
            storage_limit_gb=1024,
            renewal_date=renewal.strftime("%Y-%m-%d"),
        )
    )
