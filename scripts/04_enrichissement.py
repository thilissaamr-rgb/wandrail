"""Association nationale des POI aux trois gares les plus proches."""

import os
import sys

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.neighbors import BallTree
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()
EARTH_RADIUS_KM = 6371.0088


def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '00000')}"
        f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5434')}"
        f"/{os.getenv('DB_NAME', 'tourisme_train')}"
    )


engine = get_engine()
print("=" * 60)
print("SCRIPT 04 - Enrichissement spatial national")
print("=" * 60)

gares = pd.read_sql(
    """SELECT id, nom_gare, latitude, longitude
       FROM silver.gares WHERE latitude IS NOT NULL AND longitude IS NOT NULL""",
    engine,
)
poi = pd.read_sql(
    """SELECT id, categorie, region, latitude, longitude
       FROM silver.poi WHERE latitude IS NOT NULL AND longitude IS NOT NULL""",
    engine,
)
if gares.empty:
    raise RuntimeError("Aucune gare geocodee dans silver.gares")
if poi.empty:
    raise RuntimeError("Aucun POI geocode dans silver.poi")

print(f"Indexation de {len(gares):,} gares; recherche pour {len(poi):,} POI.")
tree = BallTree(np.radians(gares[["latitude", "longitude"]].to_numpy()), metric="haversine")
k = min(3, len(gares))
distances, indices = tree.query(
    np.radians(poi[["latitude", "longitude"]].to_numpy()), k=k
)
distances *= EARTH_RADIUS_KM

result = pd.DataFrame(
    {
        "id_poi": poi["id"].astype(int),
        "id_gare_1": gares.iloc[indices[:, 0]]["id"].to_numpy(dtype=int),
        "id_gare_2": gares.iloc[indices[:, 1]]["id"].to_numpy(dtype=int) if k > 1 else None,
        "id_gare_3": gares.iloc[indices[:, 2]]["id"].to_numpy(dtype=int) if k > 2 else None,
        "nom_gare": gares.iloc[indices[:, 0]]["nom_gare"].to_numpy(),
        "distance_gare_km": np.round(distances[:, 0], 3),
        "temps_marche_min": np.round(distances[:, 0] / 5 * 60, 1),
        "categorie": poi["categorie"].to_numpy(),
        "region": poi["region"].fillna("France").to_numpy(),
    }
)

with engine.begin() as connection:
    connection.execute(text("TRUNCATE TABLE silver.poi_enrichi RESTART IDENTITY"))
result.to_sql(
    "poi_enrichi", engine, schema="silver", if_exists="append", index=False,
    chunksize=5000, method="multi",
)

with engine.begin() as connection:
    connection.execute(text("DROP TABLE IF EXISTS public.poi_enrichi"))
    connection.execute(
        text(
            """CREATE TABLE public.poi_enrichi AS
            SELECT pe.id AS id_poi, p.nom AS nom_poi, pe.categorie, p.commune,
                   p.latitude, p.longitude, p.region, p.source,
                   pe.id_gare_1 AS id_gare_proche,
                   pe.nom_gare AS nom_gare_proche, pe.distance_gare_km
            FROM silver.poi_enrichi pe
            JOIN silver.poi p ON p.id = pe.id_poi"""
        )
    )
    connection.execute(text("CREATE INDEX idx_public_poi_gare ON public.poi_enrichi(id_gare_proche)"))

print(f"{len(result):,} POI enrichis.")
print(f"Distance mediane a une gare: {result['distance_gare_km'].median():.2f} km")
print(f"POI a moins de 10 km: {(result['distance_gare_km'] <= 10).sum():,}")
print("Script 04 termine.")
