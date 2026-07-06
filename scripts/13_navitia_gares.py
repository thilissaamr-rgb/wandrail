"""Ingestion Bronze : referentiel gares SNCF via Navitia.

Pour chaque gare de silver.gares, resout l'identifiant Navitia
(stop_area:SNCF:{code_uic}) et persiste la reponse brute + les
correspondances (lignes desservies, modes) dans bronze.navitia_gares_raw.

Ce mapping est ensuite utilise en runtime par api/navitia.py pour les
horaires temps reel (evite un lookup a chaque requete utilisateur).

Idempotent : re-execute chaque semaine dans le DAG Airflow (source
officielle SNCF mise a jour ~mensuellement).

Quota Navitia : ~5000 req/mois sur le plan gratuit. Pour 136 gares
(PDL), on consomme ~136 req. Marge confortable.
"""

import json
import os
import sys
import time

import requests
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

TOKEN = os.getenv("NAVITIA_TOKEN", "").strip()
if not TOKEN:
    print("ERREUR : NAVITIA_TOKEN absent de .env")
    sys.exit(1)

BASE_URL = "https://api.sncf.com/v1/coverage/sncf"
TIMEOUT = 8
SLEEP_BETWEEN_CALLS = 0.15  # rate limiting soft

DATABASE_URL = os.getenv("DATABASE_URL") or (
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
engine = create_engine(DATABASE_URL)


DDL = """
CREATE SCHEMA IF NOT EXISTS bronze;

CREATE TABLE IF NOT EXISTS bronze.navitia_gares_raw (
    code_uic       TEXT PRIMARY KEY,
    stop_area_id   TEXT,
    label          TEXT,
    lignes         TEXT[],
    modes          TEXT[],
    payload        JSONB,
    ingested_at    TIMESTAMPTZ DEFAULT NOW(),
    status         TEXT   -- 'ok' | 'not_found' | 'error'
);
"""


def fetch_stop_area(code_uic: str) -> dict | None:
    """Requete Navitia pour un stop_area SNCF donne."""
    stop_area = f"stop_area:SNCF:{code_uic}"
    url = f"{BASE_URL}/stop_areas/{stop_area}?depth=2"
    try:
        r = requests.get(url, auth=(TOKEN, ""), timeout=TIMEOUT)
        if r.status_code == 404:
            return {"status": "not_found"}
        r.raise_for_status()
        return {"status": "ok", "data": r.json()}
    except requests.RequestException as e:
        return {"status": "error", "error": str(e)[:200]}


def extract_lignes_et_modes(payload: dict) -> tuple[list[str], list[str]]:
    """Extrait les noms de lignes commerciales + modes physiques."""
    lignes: set[str] = set()
    modes: set[str] = set()
    for sa in payload.get("stop_areas", []):
        for line in sa.get("lines", []) or []:
            name = line.get("name") or line.get("code") or ""
            if name:
                lignes.add(name)
        for mode in sa.get("commercial_modes", []) or []:
            n = mode.get("name") or ""
            if n:
                modes.add(n)
        for mode in sa.get("physical_modes", []) or []:
            n = mode.get("name") or ""
            if n:
                modes.add(n)
    return sorted(lignes), sorted(modes)


def main() -> None:
    with engine.begin() as conn:
        # Assure la structure
        conn.execute(text(DDL))

        # Recupere la liste des gares a interroger
        gares = conn.execute(
            text("SELECT DISTINCT code_uic, nom_gare FROM silver.gares WHERE code_uic IS NOT NULL")
        ).fetchall()

    print(f"[Navitia] Ingestion pour {len(gares)} gares...")
    counts = {"ok": 0, "not_found": 0, "error": 0}

    for i, (code_uic, nom_gare) in enumerate(gares, 1):
        code_uic = str(code_uic).strip()
        if not code_uic:
            continue

        result = fetch_stop_area(code_uic)
        status = result["status"]
        counts[status] = counts.get(status, 0) + 1

        payload = result.get("data")
        lignes, modes = ([], [])
        label = None
        stop_area_id = None
        if payload:
            stop_areas = payload.get("stop_areas", [])
            if stop_areas:
                label = stop_areas[0].get("name")
                stop_area_id = stop_areas[0].get("id")
            lignes, modes = extract_lignes_et_modes(payload)

        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO bronze.navitia_gares_raw
                        (code_uic, stop_area_id, label, lignes, modes, payload, status)
                    VALUES (:c, :s, :l, :ln, :m, :p, :st)
                    ON CONFLICT (code_uic) DO UPDATE SET
                        stop_area_id = EXCLUDED.stop_area_id,
                        label        = EXCLUDED.label,
                        lignes       = EXCLUDED.lignes,
                        modes        = EXCLUDED.modes,
                        payload      = EXCLUDED.payload,
                        status       = EXCLUDED.status,
                        ingested_at  = NOW();
                    """
                ),
                {
                    "c": code_uic,
                    "s": stop_area_id,
                    "l": label,
                    "ln": lignes,
                    "m": modes,
                    "p": json.dumps(payload) if payload else None,
                    "st": status,
                },
            )

        if i % 20 == 0:
            print(f"  {i}/{len(gares)}  ok={counts['ok']}  not_found={counts.get('not_found', 0)}  errors={counts.get('error', 0)}")

        time.sleep(SLEEP_BETWEEN_CALLS)

    print(f"\n[Navitia] Termine.  OK={counts['ok']}  Non trouvees={counts.get('not_found', 0)}  Erreurs={counts.get('error', 0)}")


if __name__ == "__main__":
    main()
