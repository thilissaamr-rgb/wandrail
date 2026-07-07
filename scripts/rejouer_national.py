"""Rejoue le pipeline complet en scope national + upload sur Supabase.

Usage :
    1. Demarre Docker Desktop
    2. Lance ce script :  python scripts/rejouer_national.py
    3. Laisse tourner ~2-4h (peut etre en arriere plan)

Le script :
- Force DATA_SCOPE=france_metropolitaine
- Execute les scripts 00 -> 11 dans l ordre, avec log detaille
- Enregistre l avancement dans data/dumps/pipeline_state.json
  -> permet de reprendre en cas d interruption (relance = reprend au dernier
     checkpoint reussi)
- A la fin : dumpe la DB locale vers data/dumps/wandrail_national.sql
- Puis pousse le dump sur Supabase (via DATABASE_URL du .env)

Pre-requis :
- Docker Desktop lance
- .env avec DATATOURISME_API_KEY + DATABASE_URL Supabase valide
- Python 3.10+ avec les dependances de requirements.txt
"""

from __future__ import annotations

import io
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "data" / "dumps" / "pipeline_state.json"

# Force le scope national avant tout import
os.environ["DATA_SCOPE"] = "france_metropolitaine"
load_dotenv(ROOT / ".env")

STEPS = [
    ("01_gares", "Extraction gares SNCF"),
    ("02_datatourisme", "Extraction POI DataTourisme (LE PLUS LONG ~60 min)"),
    ("03_osm", "Extraction mobilites OSM"),
    ("04_enrichissement", "Jointure gares x POI (BallTree Haversine)"),
    ("05_gold_layer", "Agregats Gold + dimensions"),
    ("06_ml_clustering", "K-means POI"),
    ("07_ml_recommandation", "KNN par profil"),
    ("11_data_quality_migration", "Rapport qualite"),
]


def load_state() -> dict:
    if STATE.exists():
        try:
            return json.loads(STATE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(state: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def run_script(name: str) -> bool:
    """Lance scripts/{name}.py, log et retourne True si OK."""
    script = ROOT / "scripts" / f"{name}.py"
    print(f"\n{'=' * 70}\n[{time.strftime('%H:%M:%S')}] Lancement {name}\n{'=' * 70}")
    started = time.time()
    result = subprocess.run(
        [sys.executable, str(script)],
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )
    elapsed = int(time.time() - started)
    if result.returncode == 0:
        print(f"[{time.strftime('%H:%M:%S')}] OK {name} en {elapsed}s")
        return True
    print(f"[{time.strftime('%H:%M:%S')}] ECHEC {name} (code {result.returncode})")
    return False


def dump_local_db() -> Path:
    """Dumpe la DB Postgres locale (silver + gold) vers un fichier SQL."""
    out = ROOT / "data" / "dumps" / "wandrail_national.sql"
    out.parent.mkdir(parents=True, exist_ok=True)
    print(f"\n[{time.strftime('%H:%M:%S')}] Dump DB locale -> {out.name}")
    # Utilise pg_dump via docker exec (evite d installer psql en local)
    cmd = [
        "docker", "exec", "-t", "tourisme_postgres",
        "pg_dump", "-U", "postgres", "-n", "silver", "-n", "gold",
        "tourisme_train",
    ]
    with out.open("wb") as f:
        result = subprocess.run(cmd, stdout=f)
    if result.returncode != 0:
        print("Dump ECHEC")
        return None
    size_mo = out.stat().st_size / 1_000_000
    print(f"Dump OK : {size_mo:.1f} Mo")
    return out


def upload_to_supabase(dump_path: Path) -> bool:
    """Recharge le dump sur Supabase via psycopg2 en streaming."""
    import psycopg2

    url = os.getenv("DATABASE_URL")
    if not url:
        pwd = quote(os.getenv("SUPABASE_PASSWORD", ""), safe="")
        ref = os.getenv("SUPABASE_REF", "")
        if not pwd or not ref:
            print("ERREUR : DATABASE_URL absent du .env")
            return False
        url = f"postgresql://postgres.{ref}:{pwd}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"

    print(f"\n[{time.strftime('%H:%M:%S')}] Upload sur Supabase (DROP + reload)")
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("DROP SCHEMA IF EXISTS silver CASCADE;")
    cur.execute("DROP SCHEMA IF EXISTS gold CASCADE;")
    print("Schemas silver/gold droppes.")

    # On appelle le loader deja teste (dans scratchpad)
    loader = ROOT / "scripts" / "_load_dump_to_supabase.py"
    if not loader.exists():
        print(f"ERREUR : loader absent ({loader})")
        return False
    result = subprocess.run([sys.executable, str(loader), str(dump_path)])
    return result.returncode == 0


def main() -> int:
    state = load_state()
    print(f"Reprise depuis l'etat : {state.get('done', [])}")

    for name, description in STEPS:
        if name in state.get("done", []):
            print(f"[skip] {name} deja fait (state)")
            continue
        print(f"\n>>> {description}")
        if not run_script(name):
            print(f"\nArret : {name} a echoue. Relance ce script pour reprendre au meme point.")
            return 1
        state.setdefault("done", []).append(name)
        save_state(state)

    dump = dump_local_db()
    if not dump:
        return 2
    ok = upload_to_supabase(dump)
    if not ok:
        return 3

    print(f"\n[{time.strftime('%H:%M:%S')}] Pipeline national termine et pousse sur Supabase.")
    # Reset state pour prochaine execution
    save_state({})
    return 0


if __name__ == "__main__":
    sys.exit(main())
