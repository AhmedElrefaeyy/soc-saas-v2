"""
Attack-chain detection using Redis sorted sets as time-windowed counters.

Patterns:
  brute_force          ≥5 auth failures for same username in 5 min
  brute_force_success  brute_force followed by auth success for same username in 10 min
  credential_stuffing  ≥5 distinct usernames targeted from the same source IP in 5 min
  lateral_movement     auth success to ≥3 distinct hosts by same user in 10 min
"""
from __future__ import annotations

import time

from redis.asyncio import Redis

from app.core.redis import TenantRedisClient

_WIN_5M = 300
_WIN_10M = 600

_BRUTE_THRESHOLD = 5
_LATERAL_THRESHOLD = 3
_STUFFING_THRESHOLD = 5


class AttackChainDetector:

    def __init__(self, redis: Redis, tenant_id: str) -> None:
        self._c = TenantRedisClient(redis, tenant_id, "ueba")

    async def evaluate(
        self,
        category: str,
        username: str | None,
        source_ip: str | None,
        hostname: str | None,
        is_auth_success: bool,
        is_auth_failure: bool,
    ) -> list[str]:
        if category not in ("auth", "network"):
            return []

        flags: list[str] = []
        now = time.time()

        if is_auth_failure and username:
            flags.extend(await self._brute_force(username, now))

        if is_auth_success and username:
            flags.extend(await self._brute_force_success(username, now))
            if hostname:
                flags.extend(await self._lateral_movement(username, hostname, now))

        if is_auth_failure and source_ip and username:
            flags.extend(await self._credential_stuffing(source_ip, username, now))

        return flags

    async def _brute_force(self, username: str, now: float) -> list[str]:
        key = f"chain:brute:{username}:fails"
        cutoff = now - _WIN_5M
        await self._c.zremrangebyscore(key, "-inf", cutoff)
        await self._c.zadd(key, {f"{now:.6f}": now})
        await self._c.expire(key, _WIN_5M * 2)
        count = await self._c.zcount(key, cutoff, "+inf")
        return ["brute_force"] if count >= _BRUTE_THRESHOLD else []

    async def _brute_force_success(self, username: str, now: float) -> list[str]:
        key = f"chain:brute:{username}:fails"
        cutoff = now - _WIN_10M
        count = await self._c.zcount(key, cutoff, "+inf")
        if count >= _BRUTE_THRESHOLD:
            await self._c.zremrangebyscore(key, "-inf", "+inf")
            return ["brute_force_success"]
        return []

    async def _lateral_movement(self, username: str, hostname: str, now: float) -> list[str]:
        key = f"chain:lateral:{username}:hosts"
        cutoff = now - _WIN_10M
        await self._c.zremrangebyscore(key, "-inf", cutoff)
        await self._c.zadd(key, {f"{hostname}:{now:.3f}": now})
        await self._c.expire(key, _WIN_10M * 2)
        entries = await self._c.zrangebyscore(key, cutoff, "+inf")
        distinct = {e.rsplit(":", 1)[0] for e in entries}
        return ["lateral_movement"] if len(distinct) >= _LATERAL_THRESHOLD else []

    async def _credential_stuffing(
        self, source_ip: str, username: str, now: float
    ) -> list[str]:
        key = f"chain:stuff:{source_ip}:users"
        cutoff = now - _WIN_5M
        await self._c.zremrangebyscore(key, "-inf", cutoff)
        await self._c.zadd(key, {f"{username}:{now:.6f}": now})
        await self._c.expire(key, _WIN_5M * 2)
        entries = await self._c.zrangebyscore(key, cutoff, "+inf")
        distinct = {e.rsplit(":", 1)[0] for e in entries}
        return ["credential_stuffing"] if len(distinct) >= _STUFFING_THRESHOLD else []
