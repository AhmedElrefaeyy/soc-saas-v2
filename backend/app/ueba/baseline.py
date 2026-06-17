"""
Behavioral baseline tracking using Redis for per-user and per-host patterns.

Tracks:
- New source IPs seen per user   (Set, 30-day TTL)
- New processes seen per host    (Set, 30-day TTL)
- Last known login location      (Hash, 7-day TTL) for impossible-travel check
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any

from redis.asyncio import Redis

from app.core.redis import TenantRedisClient

_TTL_30D = 86400 * 30
_TTL_7D = 86400 * 7


@dataclass
class BaselineFlags:
    new_source_ip: bool = False
    new_process_on_host: bool = False
    after_hours: bool = False
    privileged_user: bool = False


class BehavioralBaseline:

    def __init__(self, redis: Redis, tenant_id: str) -> None:
        self._c = TenantRedisClient(redis, tenant_id, "ueba")

    async def evaluate(
        self,
        username: str | None,
        source_ip: str | None,
        process_name: str | None,
        hostname: str | None,
        hour_utc: int,
        is_privileged: bool = False,
    ) -> BaselineFlags:
        flags = BaselineFlags()

        # After-hours: outside 06:00–22:00 UTC
        flags.after_hours = hour_utc < 6 or hour_utc >= 22
        flags.privileged_user = is_privileged

        # New source IP for this user
        if username and source_ip:
            key = f"user:{username}:seen_ips"
            if not await self._c.sismember(key, source_ip):
                flags.new_source_ip = True
                await self._c.sadd(key, source_ip)
                await self._c.expire(key, _TTL_30D)

        # New process seen on this host
        if hostname and process_name:
            key = f"host:{hostname}:seen_procs"
            if not await self._c.sismember(key, process_name):
                flags.new_process_on_host = True
                await self._c.sadd(key, process_name)
                await self._c.expire(key, _TTL_30D)

        return flags

    async def get_last_location(self, username: str) -> dict[str, Any] | None:
        raw = await self._c.hgetall(f"user:{username}:last_location")
        if not raw or "lat" not in raw:
            return None
        return {
            "lat": float(raw["lat"]),
            "lon": float(raw["lon"]),
            "ts": float(raw["ts"]),
        }

    async def set_last_location(
        self, username: str, lat: float, lon: float
    ) -> None:
        key = f"user:{username}:last_location"
        await self._c.hset(key, {"lat": str(lat), "lon": str(lon), "ts": str(time.time())})
        await self._c.expire(key, _TTL_7D)
