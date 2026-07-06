"""Ingestion nationale des gares de voyageurs SNCF (Bronze -> Silver)."""

import io
import os
import re
import sys
import time

import pandas as pd
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

URL_GARES = (
    "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
    "gares-de-voyageurs/exports/csv"
    "?delimiter=%3B&list_separator=%2C&quote_all=false&with_bom=true"
)
URL_FREQ = (
    "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
    "frequentation-gares/exports/csv?delimiter=%3B"
)
LAT_MIN, LAT_MAX = 41.0, 51.6
LON_MIN, LON_MAX = -5.6, 10.0


def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '00000')}"
        f"@{os.getenv('DB_HOST', '127.0.0.1')}:{os.getenv('DB_PORT', '5434')}"
        f"/{os.getenv('DB_NAME', 'tourisme_train')}"
    )


def get_data_path():
    local = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
    return local if os.path.exists(local) else "/opt/airflow/data/raw"


def administrative_reference():
    """Retourne les communes et departements issus du referentiel de l'Etat."""
    departments_response = requests.get(
        "https://geo.api.gouv.fr/departements?fields=nom,code,codeRegion", timeout=45
    )
    departments_response.raise_for_status()
    regions_response = requests.get(
        "https://geo.api.gouv.fr/regions?fields=nom,code", timeout=45
    )
    regions_response.raise_for_status()
    communes_response = requests.get(
        "https://geo.api.gouv.fr/communes?fields=nom,code,codeDepartement,codeRegion",
        timeout=120,
    )
    communes_response.raise_for_status()

    region_names = {str(row["code"]): row["nom"] for row in regions_response.json()}
    departments = {
        str(row["code"]): {
            "departement": row["nom"],
            "region": region_names.get(str(row.get("codeRegion")), "France"),
        }
        for row in departments_response.json()
    }
    communes = {str(row["code"]): row for row in communes_response.json()}
    return communes, departments


def coordinates(value):
    try:
        latitude, longitude = str(value).split(",", 1)
        return float(latitude.strip()), float(longitude.strip())
    except (TypeError, ValueError):
        return None, None


engine = get_engine()
data_path = get_data_path()
csv_local = os.path.join(data_path, "gares-de-voyageurs.csv")
os.makedirs(data_path, exist_ok=True)

print("=" * 60)
print("SCRIPT 01 - Gares SNCF France metropolitaine")
print("=" * 60)

refresh = not os.path.exists(csv_local) or time.time() - os.path.getmtime(csv_local) > 7 * 86400
if refresh:
    response = requests.get(URL_GARES, timeout=120)
    response.raise_for_status()
    with open(csv_local, "wb") as output:
        output.write(response.content)
    print("Referentiel officiel gares-de-voyageurs telecharge.")

raw = pd.read_csv(csv_local, sep=";", dtype=str, encoding="utf-8-sig").fillna("")
required = {"nom", "position_geographique", "codeinsee", "codes_uic"}
missing = required.difference(raw.columns)
if missing:
    raise RuntimeError(f"Colonnes SNCF absentes: {sorted(missing)}")

bronze = pd.DataFrame(
    {
        "code_uic": raw["codes_uic"],
        "libelle": raw["nom"],
        "commune": raw["codeinsee"],
        "departement": "",
        "voyageurs": "O",
        "longitude_raw": raw["position_geographique"].map(lambda value: coordinates(value)[1]),
        "latitude_raw": raw["position_geographique"].map(lambda value: coordinates(value)[0]),
        "source_fichier": URL_GARES,
    }
)
with engine.begin() as connection:
    connection.execute(text("TRUNCATE TABLE bronze.gares_raw RESTART IDENTITY"))
bronze.to_sql("gares_raw", engine, schema="bronze", if_exists="append", index=False, chunksize=2000)

communes, departments = administrative_reference()
stations = []
for row in raw.to_dict("records"):
    latitude, longitude = coordinates(row["position_geographique"])
    if latitude is None or not (LAT_MIN <= latitude <= LAT_MAX and LON_MIN <= longitude <= LON_MAX):
        continue
    commune = communes.get(str(row["codeinsee"]), {})
    department_code = str(commune.get("codeDepartement", "")) or (
        str(row["codeinsee"])[:2] if row["codeinsee"] else ""
    )
    department = departments.get(department_code, {})
    uic_match = re.search(r"\d{8}", str(row["codes_uic"]))
    uic = uic_match.group(0) if uic_match else ""
    if not uic:
        continue
    stations.append(
        {
            "code_uic": uic,
            "nom_gare": str(row["nom"]).strip().lower(),
            "commune": str(commune.get("nom", row["nom"])).strip().lower(),
            "departement": department.get("departement", department_code),
            "code_departement": department_code,
            "region": department.get("region", "France"),
            "latitude": latitude,
            "longitude": longitude,
            "type_gare": "Voyageurs",
            "nb_voyageurs_annuel": 0,
        }
    )

silver = pd.DataFrame(stations).drop_duplicates(subset=["code_uic"])
try:
    response = requests.get(URL_FREQ, timeout=120)
    response.raise_for_status()
    frequency = pd.read_csv(io.StringIO(response.text), sep=";", low_memory=False)
    name_col = next((c for c in frequency.columns if "nom" in c.lower() and "gare" in c.lower()), None)
    value_col = next(
        (c for c in frequency.columns if "voyageur" in c.lower() and "non" not in c.lower()), None
    )
    if name_col and value_col:
        values = dict(
            zip(
                frequency[name_col].astype(str).str.strip().str.lower(),
                pd.to_numeric(frequency[value_col], errors="coerce").fillna(0).astype(int),
            )
        )
        silver["nb_voyageurs_annuel"] = silver["nom_gare"].map(values).fillna(0).astype(int)
except Exception as exc:
    print(f"Frequentation indisponible ({exc}); valeurs a zero.")

with engine.begin() as connection:
    connection.execute(text("TRUNCATE TABLE silver.gares RESTART IDENTITY CASCADE"))
silver.to_sql("gares", engine, schema="silver", if_exists="append", index=False, chunksize=2000)

print(f"{len(bronze):,} lignes Bronze; {len(silver):,} gares voyageurs Silver.")
print(silver.groupby("region").size().sort_values(ascending=False).to_string())
print("Script 01 termine.")
