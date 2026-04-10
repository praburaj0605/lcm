import json
from typing import Any

import redis
from redis.exceptions import RedisError

from app.config import get_settings

_settings = get_settings()
_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(_settings.redis_url, decode_responses=True)
    return _client


def cache_get(key: str) -> Any | None:
    try:
        r = get_redis()
        raw = r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except RedisError:
        return None


def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    try:
        r = get_redis()
        ttl = ttl if ttl is not None else _settings.cache_ttl_seconds
        r.setex(key, ttl, json.dumps(value, default=str))
    except RedisError:
        pass


def cache_delete(*keys: str) -> None:
    if not keys:
        return
    try:
        get_redis().delete(*keys)
    except (RedisError, OSError, TimeoutError):
        pass


def cache_invalidate_prefix(prefix: str) -> None:
    try:
        r = get_redis()
        for k in r.scan_iter(match=f"{prefix}*"):
            r.delete(k)
    except RedisError:
        pass
