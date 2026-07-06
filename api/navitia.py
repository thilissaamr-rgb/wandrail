"""Client Navitia SNCF (horaires temps reel).

Cache module 5 min pour eviter d'exploser les quotas gratuits Navitia
(~5000 requetes/mois). La clé API vient de l'env NAVITIA_TOKEN.

Doc officielle : https://numerique.sncf.com/startup/api/
"""

from __future__ import annotations

import os
import time
from datetime import datetime
from threading import Lock

import requests

BASE = "https://api.sncf.com/v1/coverage/sncf"
TOKEN = os.getenv("NAVITIA_TOKEN", "").strip()
TIMEOUT = 6  # secondes
CACHE_TTL = 300  # 5 min

_cache: dict[str, tuple[float, dict]] = {}
_lock = Lock()


def _get(url: str) -> dict:
    """Requete GET Navitia + Basic auth (username=clé, password vide)."""
    r = requests.get(url, auth=(TOKEN, ""), timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def _cache_get(key: str) -> dict | None:
    with _lock:
        hit = _cache.get(key)
        if not hit:
            return None
        ts, data = hit
        if time.time() - ts > CACHE_TTL:
            _cache.pop(key, None)
            return None
        return data


def _cache_set(key: str, data: dict) -> None:
    with _lock:
        _cache[key] = (time.time(), data)


def _format_dt(iso: str) -> dict:
    """Navitia renvoie 'YYYYMMDDTHHMMSS'. On extrait heure + minutes lisibles."""
    if not iso or len(iso) < 15:
        return {"raw": iso, "hour": None, "in_minutes": None}
    dt = datetime.strptime(iso, "%Y%m%dT%H%M%S")
    now = datetime.now()
    delta = (dt - now).total_seconds() / 60
    return {
        "raw": iso,
        "hour": dt.strftime("%H:%M"),
        "date": dt.strftime("%d/%m"),
        "in_minutes": max(0, round(delta)),
    }


def next_departures(code_uic: str, count: int = 8) -> dict:
    """Prochains departs d'une gare (identifiee par son code UIC).

    Retourne : {'available': bool, 'departures': [...], 'error': str|None}
    """
    if not TOKEN:
        return {"available": False, "departures": [], "error": "NAVITIA_TOKEN non configure"}
    code_uic = str(code_uic).strip()
    if not code_uic:
        return {"available": False, "departures": [], "error": "code_uic manquant"}

    cache_key = f"dep:{code_uic}:{count}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    stop_area = f"stop_area:SNCF:{code_uic}"
    url = f"{BASE}/stop_areas/{stop_area}/departures?count={count}&data_freshness=realtime"
    try:
        data = _get(url)
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 0
        msg = "gare inconnue de Navitia" if status == 404 else f"HTTP {status}"
        return {"available": False, "departures": [], "error": msg}
    except requests.RequestException as e:
        return {"available": False, "departures": [], "error": str(e)[:120]}

    departures = []
    for dep in data.get("departures", []):
        info = dep.get("display_informations", {}) or {}
        stops = dep.get("stop_date_time", {}) or {}
        route = dep.get("route", {}) or {}
        direction = route.get("direction", {}).get("name") or info.get("direction") or ""
        departures.append({
            "direction": direction,
            "network": info.get("network", ""),      # ex "TER"
            "commercial_mode": info.get("commercial_mode", ""),  # ex "TER"
            "physical_mode": info.get("physical_mode", ""),
            "headsign": info.get("headsign", ""),
            "trip_short_name": info.get("trip_short_name", ""),
            "departure": _format_dt(stops.get("departure_date_time", "")),
            "base_departure": _format_dt(stops.get("base_departure_date_time", "")),
        })

    result = {"available": True, "departures": departures, "error": None}
    _cache_set(cache_key, result)
    return result
