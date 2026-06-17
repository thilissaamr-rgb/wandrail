import sys
import requests
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

engine = create_engine(
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

print("=" * 50)
print("🚲 SCRIPT 3 : Mobilités locales")
print("=" * 50)

mobilites = []

# --------------------------------
# ÉTAPE 1 — Vélos Nantes (Bicloo)
# --------------------------------
print("\n📡 Récupération vélos Nantes (Bicloo)...")
try:
    URL_NANTES = (
        "https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/"
        "244400404_stations-velos-libre-service-nantes-metropole-disponibilites/exports/json"
    )
    r = requests.get(URL_NANTES, timeout=30)
    if r.status_code == 200:
        stations = r.json()
        for s in stations:
            lat = s.get("latitude", 0)
            lon = s.get("longitude", 0)
            if lat and lon:
                mobilites.append({
                    "type_mobilite": "velo",
                    "nom_station"  : s.get("nom", ""),
                    "latitude"     : float(lat),
                    "longitude"    : float(lon),
                    "commune"      : "nantes",
                    "nb_places"    : s.get("nombreemplacementsactuels", 0),
                    "source"       : "nantes_metropole"
                })
        print(f"✅ {len([m for m in mobilites if m['commune']=='nantes'])} stations Nantes !")
    else:
        print(f"⚠️ Nantes : {r.status_code}")
except Exception as e:
    print(f"⚠️ Erreur Nantes : {e}")

# --------------------------------
# ÉTAPE 2 — Vélos via API transport.data.gouv.fr (catalogue GBFS)
# --------------------------------
print("\n📡 Récupération flux vélos nationaux (transport.data.gouv.fr)...")
try:
    URL_CATALOGUE = "https://transport.data.gouv.fr/api/datasets?type=bike-sharing&format=gbfs"
    r = requests.get(URL_CATALOGUE, timeout=30)
    if r.status_code == 200:
        datasets = r.json()
        feeds_tried = 0
        for dataset in datasets[:10]:
            resources = dataset.get("resources", [])
            for res in resources:
                url = res.get("url", "")
                if "station_information" in url or ("gbfs" in url and url.endswith(".json")):
                    try:
                        r2 = requests.get(url, timeout=15)
                        if r2.status_code == 200:
                            data2 = r2.json()
                            stations = (
                                data2.get("data", {}).get("stations") or
                                data2.get("data", {}).get("fr", {}).get("stations", [])
                            )
                            if stations:
                                city = dataset.get("title", "inconnu").lower()[:30]
                                for s in stations:
                                    lat = s.get("lat", 0)
                                    lon = s.get("lon", 0)
                                    if lat and lon:
                                        mobilites.append({
                                            "type_mobilite": "velo",
                                            "nom_station"  : s.get("name", ""),
                                            "latitude"     : float(lat),
                                            "longitude"    : float(lon),
                                            "commune"      : city,
                                            "nb_places"    : s.get("capacity", 0),
                                            "source"       : "transport_data_gouv"
                                        })
                                feeds_tried += 1
                    except Exception:
                        continue
        print(f"✅ {feeds_tried} flux GBFS traités")
    else:
        print(f"⚠️ Catalogue transport.data.gouv.fr : {r.status_code}")
except Exception as e:
    print(f"⚠️ Erreur catalogue GBFS : {e}")

# --------------------------------
# ÉTAPE 3 — Parkings vélo gares SNCF
# --------------------------------
print("\n📡 Parkings vélo en gares SNCF...")
try:
    URL_PARKINGS = (
        "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
        "gares-pianos/exports/json?limit=500"
    )
    r = requests.get(URL_PARKINGS, timeout=30)
    if r.status_code == 200:
        parkings = r.json()
        for p in parkings:
            geo = p.get("position_geographique", {})
            lat = geo.get("lat", 0) if geo else 0
            lon = geo.get("lon", 0) if geo else 0
            if lat and lon:
                mobilites.append({
                    "type_mobilite": "parking_velo_gare",
                    "nom_station"  : p.get("libelle_gare", ""),
                    "latitude"     : float(lat),
                    "longitude"    : float(lon),
                    "commune"      : p.get("commune", "").lower(),
                    "nb_places"    : p.get("nb_places_velo", 0) or 0,
                    "source"       : "sncf"
                })
        print(f"✅ {len([m for m in mobilites if m['type_mobilite']=='parking_velo_gare'])} parkings vélo gares SNCF !")
    else:
        print(f"⚠️ Parkings vélo SNCF : {r.status_code}")
except Exception as e:
    print(f"⚠️ Erreur parkings SNCF : {e}")

# --------------------------------
# ÉTAPE 4 — Table CO2 (valeurs ADEME 2023)
# --------------------------------
print("\n🌿 Création table CO2 ADEME 2023...")

CO2 = {
    "train"         : 2.4,
    "voiture_seul"  : 218.0,
    "voiture_2pers" : 109.0,
    "avion"         : 258.0,
    "bus"           : 103.0,
    "velo"          : 0.0,
    "moto"          : 191.0,
}

distances  = [50, 100, 200, 300, 500, 800, 1000]
trajets_co2 = []
for km in distances:
    trajets_co2.append({
        "distance_km"   : km,
        "co2_train"     : round(CO2["train"] * km, 1),
        "co2_voiture"   : round(CO2["voiture_seul"] * km, 1),
        "co2_voiture_2" : round(CO2["voiture_2pers"] * km, 1),
        "co2_avion"     : round(CO2["avion"] * km, 1),
        "co2_bus"       : round(CO2["bus"] * km, 1),
        "co2_moto"      : round(CO2["moto"] * km, 1),
        "economie_vs_voiture" : round((CO2["voiture_seul"] - CO2["train"]) * km, 1),
        "economie_vs_avion"   : round((CO2["avion"] - CO2["train"]) * km, 1),
    })

df_co2 = pd.DataFrame(trajets_co2)
print(f"✅ Table CO2 : {len(df_co2)} distances de référence")
print(df_co2[['distance_km', 'co2_train', 'co2_voiture', 'co2_avion', 'economie_vs_voiture']].to_string())

# --------------------------------
# ÉTAPE 5 — Nettoyage mobilités
# --------------------------------
df_mob = pd.DataFrame(mobilites)

if len(df_mob) > 0:
    df_mob = df_mob[
        (df_mob['latitude'].between(41, 52)) &
        (df_mob['longitude'].between(-5, 10))
    ]
    avant  = len(df_mob)
    df_mob = df_mob.drop_duplicates(subset=['nom_station', 'latitude'])
    print(f"\n🚲 Mobilités : {avant} → {len(df_mob)} après nettoyage")
    print(df_mob['type_mobilite'].value_counts().to_string())
else:
    print("\n⚠️ Pas de données mobilité — table vide créée")

# --------------------------------
# ÉTAPE 6 — LOAD
# --------------------------------
print("\n📤 Envoi dans PostgreSQL...")

if len(df_mob) > 0:
    df_mob.to_sql('mobilites', engine, if_exists='replace', index=False)
    print(f"✅ {len(df_mob)} stations insérées dans 'mobilites' !")
else:
    df_mob_vide = pd.DataFrame(columns=['type_mobilite', 'nom_station', 'latitude', 'longitude', 'commune', 'nb_places', 'source'])
    df_mob_vide.to_sql('mobilites', engine, if_exists='replace', index=False)
    print("⚠️ Table mobilités vide créée")

df_co2.to_sql('co2_trajets', engine, if_exists='replace', index=False)
print("✅ Table CO2 insérée !")
print("\n🎉 Script 3 terminé !")
