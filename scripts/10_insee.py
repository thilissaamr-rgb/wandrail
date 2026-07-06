"""Import national des populations communales depuis l'API Geo de l'Etat."""

import os
import sys

import pandas as pd
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()


def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '00000')}"
        f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5434')}"
        f"/{os.getenv('DB_NAME', 'tourisme_train')}"
    )


engine = get_engine()
codes = pd.read_sql(
    """SELECT DISTINCT code_departement FROM silver.gares
       WHERE code_departement IS NOT NULL AND code_departement <> ''
       ORDER BY code_departement""",
    engine,
)["code_departement"].astype(str).tolist()
if not codes:
    raise RuntimeError("Aucun departement disponible; executez d'abord scripts/01_gares.py")

print("=" * 60)
print(f"SCRIPT 10 - Population INSEE France ({len(codes)} departements)")
print("=" * 60)

rows = []
failed = []
for index, code in enumerate(codes, start=1):
    try:
        response = requests.get(
            "https://geo.api.gouv.fr/communes",
            params={
                "codeDepartement": code,
                "fields": "nom,code,codeDepartement,population,surface",
                "format": "json",
            },
            timeout=45,
        )
        response.raise_for_status()
        for commune in response.json():
            surface = float(commune.get("surface", 0) or 0) / 100
            population = int(commune.get("population", 0) or 0)
            rows.append(
                {
                    "commune": str(commune.get("nom", "")).strip().lower(),
                    "code_commune": str(commune.get("code", "")),
                    "population_2024": population,
                    "superficie_km2": round(surface, 2),
                    "densite": round(population / surface, 1) if surface else 0,
                    "revenu_moyen": None,
                }
            )
        if index % 10 == 0:
            print(f"  {index}/{len(codes)} departements; {len(rows):,} communes")
    except Exception as exc:
        failed.append((code, str(exc)))

if not rows:
    raise RuntimeError("La source officielle n'a retourne aucune commune")

frame = pd.DataFrame(rows).drop_duplicates(subset=["code_commune"])
with engine.begin() as connection:
    connection.execute(text("TRUNCATE TABLE silver.population RESTART IDENTITY"))
frame.to_sql(
    "population", engine, schema="silver", if_exists="append", index=False,
    chunksize=3000, method="multi",
)

print(f"{len(frame):,} communes chargees sans donnee demographique inventee.")
if failed:
    print("Departements en erreur:", ", ".join(code for code, _ in failed))
print("Script 10 termine.")
