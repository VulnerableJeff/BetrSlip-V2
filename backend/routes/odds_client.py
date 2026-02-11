"""
Centralized Odds API client with in-memory cache + rate limiting.
All routes MUST use this instead of making direct API calls.
Prevents rate-limit (429) and auth (401) errors from The Odds API.
"""
import aiohttp
import asyncio
import os
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

BASE_URL = 'https://api.the-odds-api.com/v4'

# In-memory cache: {cache_key: {"data": ..., "expires_at": timestamp}}
_mem_cache = {}
CACHE_TTL = 600  # 10 minutes — prevents hammering API on page loads

# Global semaphore: max 1 concurrent API call to avoid bursts
_api_semaphore = asyncio.Semaphore(1)

# Rate limiter: track last call time, enforce 1.2 second between calls
_last_api_call = 0
RATE_LIMIT_DELAY = 1.2  # seconds between API calls

# Circuit breaker: stop calling API after consecutive failures
_consecutive_failures = 0
_circuit_open_until = 0  # timestamp when circuit breaker resets
CIRCUIT_BREAKER_THRESHOLD = 5  # open circuit after N consecutive failures (raised for deploy resilience)
CIRCUIT_BREAKER_RESET = 60  # seconds to wait before retrying (reduced for faster recovery)

# Warmup mode: don't count startup failures toward circuit breaker
_warmup_mode = True


def _get_api_key() -> str:
    """Read API key at call time (not import time) to ensure .env is loaded.
    Falls back to reading .env file directly if env var is empty."""
    key = os.environ.get('ODDS_API_KEY', '')
    if not key:
        # Fallback: try loading .env directly
        try:
            from pathlib import Path
            env_path = Path(__file__).parent.parent / '.env'
            if env_path.exists():
                with open(env_path) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('ODDS_API_KEY='):
                            key = line.split('=', 1)[1].strip().strip('"').strip("'")
                            if key:
                                os.environ['ODDS_API_KEY'] = key
                                logger.info(f"Loaded ODDS_API_KEY from .env file (len={len(key)})")
                            break
        except Exception as e:
            logger.warning(f"Failed to read .env fallback: {e}")
    return key


def reset_circuit_breaker():
    """Reset circuit breaker state — call after warmup to give user requests a clean slate."""
    global _consecutive_failures, _circuit_open_until, _warmup_mode
    _consecutive_failures = 0
    _circuit_open_until = 0
    _warmup_mode = False
    logger.info("Circuit breaker reset — ready for live requests")


def set_warmup_mode(enabled: bool):
    """Toggle warmup mode. In warmup mode, failures don't trigger circuit breaker."""
    global _warmup_mode
    _warmup_mode = enabled


def _is_circuit_open() -> bool:
    """Check if circuit breaker is open (too many failures)"""
    global _consecutive_failures
    if _consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
        if time.time() < _circuit_open_until:
            return True
        # Cooldown expired — reset counter and allow retry
        _consecutive_failures = 0
        return False
    return False


def _get_cache_key(sport_key: str, markets: str) -> str:
    """Normalized cache key - sorted markets to avoid duplicates"""
    sorted_markets = '_'.join(sorted(markets.split(',')))
    return f"odds_cache_{sport_key}_{sorted_markets}"


def _get_from_mem_cache(key: str):
    """Check in-memory cache, return data if not expired"""
    entry = _mem_cache.get(key)
    if entry and entry['expires_at'] > time.time():
        return entry['data']
    return None


def _set_mem_cache(key: str, data, ttl: int = CACHE_TTL):
    """Store in in-memory cache with TTL"""
    _mem_cache[key] = {"data": data, "expires_at": time.time() + ttl}


async def fetch_odds(sport_key: str, markets: str = 'h2h,spreads,totals', db=None) -> list:
    """
    Fetch odds with 3-layer caching: memory -> MongoDB -> API.
    Rate-limited with circuit breaker to prevent 429/401 floods.
    """
    global _last_api_call, _consecutive_failures, _circuit_open_until
    cache_key = _get_cache_key(sport_key, markets)

    # Layer 1: In-memory cache (instant, no DB hit)
    mem_data = _get_from_mem_cache(cache_key)
    if mem_data is not None:
        return mem_data

    # Layer 2: MongoDB cache
    if db is not None:
        try:
            cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
            if cached and cached.get('data'):
                cache_age = 0
                updated = cached.get('updated_at', '')
                if updated:
                    try:
                        cache_time = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                        cache_age = (datetime.now(timezone.utc) - cache_time).total_seconds()
                    except (ValueError, TypeError):
                        cache_age = 999

                # Use DB cache if less than 10 minutes old
                if cache_age < 600:
                    _set_mem_cache(cache_key, cached['data'])
                    return cached['data']
        except Exception as e:
            logger.error(f"DB cache read error: {e}")

    # Layer 3: API call (rate-limited, serialized, circuit-broken)
    api_key = _get_api_key()
    if not api_key:
        logger.debug("No ODDS_API_KEY configured, serving from cache only")
        return await _fallback_to_stale_cache(cache_key, db)

    if _is_circuit_open():
        logger.debug(f"Circuit breaker open, skipping API call for {sport_key}")
        return await _fallback_to_stale_cache(cache_key, db)

    async with _api_semaphore:
        # Check mem cache again (another request may have populated it while we waited)
        mem_data = _get_from_mem_cache(cache_key)
        if mem_data is not None:
            return mem_data

        # Rate limit: wait if needed
        now = time.time()
        elapsed = now - _last_api_call
        if elapsed < RATE_LIMIT_DELAY:
            await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)

        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    'apiKey': api_key,
                    'regions': 'us',
                    'markets': markets,
                    'oddsFormat': 'american',
                    'dateFormat': 'iso'
                }
                async with session.get(
                    f"{BASE_URL}/sports/{sport_key}/odds",
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=12)
                ) as resp:
                    _last_api_call = time.time()

                    if resp.status == 200:
                        data = await resp.json()
                        _consecutive_failures = 0  # Reset circuit breaker
                        if data:
                            _set_mem_cache(cache_key, data)
                            if db is not None:
                                try:
                                    await db.api_cache.update_one(
                                        {"key": cache_key},
                                        {"$set": {
                                            "key": cache_key,
                                            "data": data,
                                            "updated_at": datetime.now(timezone.utc).isoformat()
                                        }},
                                        upsert=True
                                    )
                                except Exception:
                                    pass
                        return data or []

                    elif resp.status == 401:
                        if not _warmup_mode:
                            _consecutive_failures += 1
                            if _consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                                _circuit_open_until = time.time() + CIRCUIT_BREAKER_RESET
                                logger.warning(f"Odds API auth failed {_consecutive_failures}x — circuit breaker OPEN for {CIRCUIT_BREAKER_RESET}s")
                            else:
                                logger.warning(f"Odds API auth failed for {sport_key} (key prefix: {api_key[:6]}...)")
                        else:
                            logger.warning(f"Odds API auth failed for {sport_key} during warmup (not counting toward circuit breaker)")
                    elif resp.status == 429:
                        if not _warmup_mode:
                            _consecutive_failures += 1
                            if _consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                                _circuit_open_until = time.time() + CIRCUIT_BREAKER_RESET
                                logger.warning(f"Odds API rate limited {_consecutive_failures}x — circuit breaker OPEN for {CIRCUIT_BREAKER_RESET}s")
                            else:
                                logger.warning(f"Odds API rate limited for {sport_key}")
                        else:
                            logger.warning(f"Odds API rate limited for {sport_key} during warmup (not counting)")
                    else:
                        logger.warning(f"Odds API {resp.status} for {sport_key}")

        except asyncio.TimeoutError:
            logger.warning(f"Odds API timeout for {sport_key}")
        except Exception as e:
            logger.error(f"Odds API error for {sport_key}: {e}")

    return await _fallback_to_stale_cache(cache_key, db)


async def _fallback_to_stale_cache(cache_key: str, db) -> list:
    """Serve stale DB cache as last resort"""
    if db is not None:
        try:
            cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
            if cached and cached.get('data'):
                _set_mem_cache(cache_key, cached['data'], ttl=120)
                return cached['data']
        except Exception:
            pass
    return []


async def fetch_events(sport_key: str, db=None) -> list:
    """Fetch events for a sport (used by player props). Memory + DB cached."""
    global _last_api_call, _consecutive_failures, _circuit_open_until
    cache_key = f"events_cache_{sport_key}"

    mem_data = _get_from_mem_cache(cache_key)
    if mem_data is not None:
        return mem_data

    if db is not None:
        try:
            cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
            if cached and cached.get('data'):
                cache_age = 0
                updated = cached.get('updated_at', '')
                if updated:
                    try:
                        cache_time = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                        cache_age = (datetime.now(timezone.utc) - cache_time).total_seconds()
                    except (ValueError, TypeError):
                        cache_age = 999
                if cache_age < 600:
                    _set_mem_cache(cache_key, cached['data'])
                    return cached['data']
        except Exception:
            pass

    api_key = _get_api_key()
    if not api_key or _is_circuit_open():
        return await _fallback_to_stale_cache(cache_key, db)

    async with _api_semaphore:
        mem_data = _get_from_mem_cache(cache_key)
        if mem_data is not None:
            return mem_data

        now = time.time()
        elapsed = now - _last_api_call
        if elapsed < RATE_LIMIT_DELAY:
            await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)

        try:
            async with aiohttp.ClientSession() as session:
                url = f"{BASE_URL}/sports/{sport_key}/events"
                params = {'apiKey': api_key}
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=12)) as resp:
                    _last_api_call = time.time()
                    if resp.status == 200:
                        data = await resp.json()
                        _consecutive_failures = 0
                        if data:
                            _set_mem_cache(cache_key, data)
                            if db is not None:
                                try:
                                    await db.api_cache.update_one(
                                        {"key": cache_key},
                                        {"$set": {"key": cache_key, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}},
                                        upsert=True
                                    )
                                except Exception:
                                    pass
                        return data or []
                    elif resp.status in (401, 429):
                        if not _warmup_mode:
                            _consecutive_failures += 1
                            if _consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                                _circuit_open_until = time.time() + CIRCUIT_BREAKER_RESET
                                logger.warning(f"Events API {resp.status} — circuit breaker OPEN")
                        else:
                            logger.warning(f"Events API {resp.status} for {sport_key} during warmup (not counting)")
                    else:
                        logger.warning(f"Events API {resp.status} for {sport_key}")
        except Exception as e:
            logger.error(f"Events fetch error: {e}")

    return await _fallback_to_stale_cache(cache_key, db)


async def fetch_event_props(sport_key: str, event_id: str, markets: str, db=None) -> dict | None:
    """Fetch player props for a specific event. Memory + DB cached."""
    global _last_api_call, _consecutive_failures, _circuit_open_until
    cache_key = f"props_cache_{event_id}_{markets.replace(',','_')}"

    mem_data = _get_from_mem_cache(cache_key)
    if mem_data is not None:
        return mem_data

    if db is not None:
        try:
            cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
            if cached and cached.get('data'):
                cache_age = 0
                updated = cached.get('updated_at', '')
                if updated:
                    try:
                        cache_time = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                        cache_age = (datetime.now(timezone.utc) - cache_time).total_seconds()
                    except (ValueError, TypeError):
                        cache_age = 999
                if cache_age < 600:
                    _set_mem_cache(cache_key, cached['data'])
                    return cached['data']
        except Exception:
            pass

    api_key = _get_api_key()
    if not api_key or _is_circuit_open():
        # Try stale cache
        if db is not None:
            try:
                cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
                if cached and cached.get('data'):
                    _set_mem_cache(cache_key, cached['data'], ttl=120)
                    return cached['data']
            except Exception:
                pass
        return None

    async with _api_semaphore:
        mem_data = _get_from_mem_cache(cache_key)
        if mem_data is not None:
            return mem_data

        now = time.time()
        elapsed = now - _last_api_call
        if elapsed < RATE_LIMIT_DELAY:
            await asyncio.sleep(RATE_LIMIT_DELAY - elapsed)

        try:
            async with aiohttp.ClientSession() as session:
                url = f"{BASE_URL}/sports/{sport_key}/events/{event_id}/odds"
                params = {
                    'apiKey': api_key,
                    'regions': 'us',
                    'markets': markets,
                    'oddsFormat': 'american'
                }
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=12)) as resp:
                    _last_api_call = time.time()
                    if resp.status == 200:
                        data = await resp.json()
                        _consecutive_failures = 0
                        if data:
                            _set_mem_cache(cache_key, data)
                            if db is not None:
                                try:
                                    await db.api_cache.update_one(
                                        {"key": cache_key},
                                        {"$set": {"key": cache_key, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}},
                                        upsert=True
                                    )
                                except Exception:
                                    pass
                        return data
                    elif resp.status in (401, 429):
                        if not _warmup_mode:
                            _consecutive_failures += 1
                            if _consecutive_failures >= CIRCUIT_BREAKER_THRESHOLD:
                                _circuit_open_until = time.time() + CIRCUIT_BREAKER_RESET
                                logger.warning(f"Props API {resp.status} — circuit breaker OPEN")
                            else:
                                logger.warning(f"Props API {resp.status} for event {event_id}")
                        else:
                            logger.warning(f"Props API {resp.status} for event {event_id} during warmup (not counting)")
        except Exception as e:
            logger.error(f"Props fetch error: {e}")

    if db is not None:
        try:
            cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})
            if cached and cached.get('data'):
                _set_mem_cache(cache_key, cached['data'], ttl=120)
                return cached['data']
        except Exception:
            pass

    return None
