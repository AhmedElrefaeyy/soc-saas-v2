"""
UEBAService — Phase 2 behavioral analysis orchestrator.

Pipeline for each event:
  1. Behavioral baseline  (new IP, new process, after-hours, privileged user)
  2. Impossible travel    (auth events with GeoIP data)
  3. Attack chain         (brute force, lateral movement, credential stuffing)
  4. Anomaly scoring      (additive weighted score → is_anomaly flag)
"""
from __future__ import annotations

import time

import structlog
from redis.asyncio import Redis

from app.normalization.models import NormalizedEvent
from app.threat_intel.service import EnrichmentResult
from app.ueba.anomaly import AnomalyResult, compute_anomaly
from app.ueba.attack_chain import AttackChainDetector
from app.ueba.baseline import BehavioralBaseline
from app.ueba.impossible_travel import is_impossible_travel

logger = structlog.get_logger(__name__)

UEBAResult = AnomalyResult


class UEBAService:

    @staticmethod
    async def analyze(
        normalized: NormalizedEvent,
        enrichment: EnrichmentResult | None,
        redis: Redis,
        tenant_id: str,
    ) -> UEBAResult:
        """Run the full UEBA pipeline. Never raises — returns zero-score on error."""
        try:
            return await UEBAService._analyze(normalized, enrichment, redis, tenant_id)
        except Exception as exc:
            logger.warning("ueba_analysis_error", error=str(exc))
            return UEBAResult()

    @staticmethod
    async def _analyze(
        normalized: NormalizedEvent,
        enrichment: EnrichmentResult | None,
        redis: Redis,
        tenant_id: str,
    ) -> UEBAResult:
        enr = enrichment or EnrichmentResult()
        username = normalized.username
        source_ip = normalized.source_ip
        process_name = normalized.process_name
        hostname = normalized.hostname or None
        category = normalized.category

        import datetime as _dt
        ts = normalized.timestamp or _dt.datetime.now(_dt.timezone.utc)
        hour_utc = ts.hour
        is_privileged = normalized.user.is_privileged if normalized.user else False

        # ── 1. Behavioral baseline ─────────────────────────────────────────────
        baseline = BehavioralBaseline(redis, tenant_id)
        bl_flags: list[str] = []

        bfl = await baseline.evaluate(
            username=username,
            source_ip=source_ip,
            process_name=process_name,
            hostname=hostname,
            hour_utc=hour_utc,
            is_privileged=is_privileged,
        )
        if bfl.after_hours:
            bl_flags.append("after_hours")
        if bfl.new_source_ip:
            bl_flags.append("new_source_ip")
        if bfl.new_process_on_host:
            bl_flags.append("new_process_on_host")
        if bfl.privileged_user:
            bl_flags.append("privileged_user")

        # ── 2. Impossible travel (auth + GeoIP only) ───────────────────────────
        if username and enr.geo_latitude and enr.geo_longitude and category == "auth":
            last = await baseline.get_last_location(username)
            curr_ts = ts.timestamp() if hasattr(ts, "timestamp") else time.time()
            if last and is_impossible_travel(
                last["lat"], last["lon"], last["ts"],
                enr.geo_latitude, enr.geo_longitude, curr_ts,
            ):
                bl_flags.append("impossible_travel")
            await baseline.set_last_location(username, enr.geo_latitude, enr.geo_longitude)

        # ── 3. Auth success / failure classification ───────────────────────────
        tags_lower = [t.lower() for t in normalized.tags]
        raw_str = str(normalized.raw).lower()
        is_auth_success = category == "auth" and (
            "success" in tags_lower or "logon" in tags_lower or "4624" in raw_str
        )
        is_auth_failure = category == "auth" and (
            "fail" in tags_lower or "4625" in raw_str or "logonfailure" in raw_str
        )

        # ── 4. Attack chain detection ──────────────────────────────────────────
        detector = AttackChainDetector(redis, tenant_id)
        chain_flags = await detector.evaluate(
            category=category,
            username=username,
            source_ip=source_ip,
            hostname=hostname,
            is_auth_success=is_auth_success,
            is_auth_failure=is_auth_failure,
        )

        # ── 5. Final anomaly score ─────────────────────────────────────────────
        result = compute_anomaly(
            baseline_flags=bl_flags,
            attack_chain_flags=chain_flags,
            is_threat_ip=enr.is_threat_ip,
        )

        if result.is_anomaly:
            logger.info(
                "ueba_anomaly_detected",
                tenant_id=tenant_id,
                username=username,
                hostname=hostname,
                score=result.anomaly_score,
                flags=result.ueba_flags,
            )

        return result
