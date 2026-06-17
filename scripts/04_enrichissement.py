"""
Script 04 — Enrichissement POI ↔ Gares
1. Calcule la distance entre chaque POI et toutes les gares PDL
2. Calcule le temps de marche estimé (5 km/h)
3. Identifie le top 3 gares les plus proches de chaque POI
4. Insère dans silver.poi_enrichi
Résultat attendu : autant de lignes que silver.poi
"""

import sys, os, math
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER','postgres')}:{os.getenv('DB_PASSWORD','00000')}"
        f"@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5434')}/{os.getenv('DB_NAME','tourisme_train')}"
    )

engine = get_engine()

print("=" * 60)
print("🔗 SCRIPT 04 — Enrichissement POI ↔ Gares")
print("=" * 60)

# ── ÉTAPE 1 : Chargement ────────────────────────────────────────
print("\n📥 Chargement des données Silver...")
df_gares = pd.read_sql("SELECT id, nom_gare, commune, latitude, longitude FROM silver.gares", engine)
df_poi   = pd.read_sql("SELECT id, nom, categorie, commune, latitude, longitude FROM silver.poi", engine)
print(f"✅ {len(df_gares)} gares / {len(df_poi)} POI")

if len(df_gares) == 0:
    print("❌ Aucune gare dans silver.gares — exécutez d'abord le script 01")
    exit(1)

# ── ÉTAPE 2 : Fonction distance Haversine ───────────────────────
def haversine(lat1, lon1, lat2, lon2):
    """
    Calcule la distance en km entre deux points GPS.
    Formule Haversine — précision suffisante pour < 500 km.
    """
    R = 6371
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ── ÉTAPE 3 : Calcul distances ──────────────────────────────────
print("\n🔍 Calcul distances POI ↔ Gares...")
print("⏳ Cela peut prendre 2-3 minutes pour 15 000 POI × 100 gares...")

gares_arr = df_gares[['id','nom_gare','latitude','longitude']].values
resultats = []

for i, poi in df_poi.iterrows():
    distances = []
    for gare in gares_arr:
        id_g, nom_g, lat_g, lon_g = gare
        try:
            d = haversine(poi['latitude'], poi['longitude'], float(lat_g), float(lon_g))
            distances.append((id_g, nom_g, d))
        except Exception:
            continue

    if not distances:
        continue

    # Trier par distance et prendre le top 3
    distances.sort(key=lambda x: x[2])
    top3 = distances[:3]

    gare1 = top3[0] if len(top3) > 0 else (None, None, None)
    gare2 = top3[1] if len(top3) > 1 else (None, None, None)
    gare3 = top3[2] if len(top3) > 2 else (None, None, None)

    dist_km       = round(gare1[2], 3)
    temps_marche  = round((dist_km / 5.0) * 60, 1)  # 5 km/h → minutes

    resultats.append({
        "id_poi"          : int(poi['id']),
        "id_gare_1"       : int(gare1[0]) if gare1[0] is not None else None,
        "id_gare_2"       : int(gare2[0]) if gare2[0] is not None else None,
        "id_gare_3"       : int(gare3[0]) if gare3[0] is not None else None,
        "nom_gare"        : str(gare1[1]) if gare1[1] else None,
        "distance_gare_km": dist_km,
        "temps_marche_min": temps_marche,
        "categorie"       : poi['categorie'],
        "region"          : "Pays de la Loire",
    })

    if (i + 1) % 1000 == 0:
        print(f"   → {i + 1}/{len(df_poi)} POI traités...")

df_enrichi = pd.DataFrame(resultats)
print(f"\n✅ {len(df_enrichi)} POI enrichis !")

# Statistiques
print(f"\n📊 Statistiques :")
print(f"   Distance moyenne  : {df_enrichi['distance_gare_km'].mean():.2f} km")
print(f"   POI à ≤ 2 km      : {(df_enrichi['distance_gare_km'] <= 2).sum()}")
print(f"   POI à ≤ 5 km      : {(df_enrichi['distance_gare_km'] <= 5).sum()}")
print(f"   POI à ≤ 10 km     : {(df_enrichi['distance_gare_km'] <= 10).sum()}")
print(f"   Temps marche moy  : {df_enrichi['temps_marche_min'].mean():.1f} min")

# ── ÉTAPE 4 : Insertion Silver ──────────────────────────────────
print("\n📤 Insertion dans silver.poi_enrichi...")
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE silver.poi_enrichi RESTART IDENTITY"))
    for _, row in df_enrichi.iterrows():
        conn.execute(text("""
            INSERT INTO silver.poi_enrichi
              (id_poi, id_gare_1, id_gare_2, id_gare_3, nom_gare,
               distance_gare_km, temps_marche_min, categorie, region)
            VALUES (:poi, :g1, :g2, :g3, :nom, :dist, :tps, :cat, :reg)
        """), {
            "poi" : row['id_poi'],
            "g1"  : row['id_gare_1'],
            "g2"  : row['id_gare_2'],
            "g3"  : row['id_gare_3'],
            "nom" : row['nom_gare'],
            "dist": row['distance_gare_km'],
            "tps" : row['temps_marche_min'],
            "cat" : row['categorie'],
            "reg" : row['region'],
        })
    conn.commit()

nb = pd.read_sql("SELECT COUNT(*) as n FROM silver.poi_enrichi", engine).iloc[0]['n']
print(f"✅ {nb} lignes dans silver.poi_enrichi")

# Aussi mettre à jour l'ancienne table public.poi_enrichi pour compatibilité
print("\n📤 Mise à jour de public.poi_enrichi (compatibilité)...")
try:
    df_compat = pd.read_sql("""
        SELECT pe.id as id_poi,
               p.nom as nom_poi,
               pe.categorie,
               p.commune,
               p.latitude,
               p.longitude,
               'Pays de la Loire' as region,
               'datatourisme' as source,
               g.id as id_gare_proche,
               pe.nom_gare as nom_gare_proche,
               pe.distance_gare_km
        FROM silver.poi_enrichi pe
        JOIN silver.poi p ON p.id = pe.id_poi
        LEFT JOIN silver.gares g ON g.id = pe.id_gare_1
    """, engine)
    df_compat.to_sql('poi_enrichi', engine, if_exists='replace', index=False)
    print(f"✅ public.poi_enrichi mis à jour ({len(df_compat)} lignes)")
except Exception as e:
    print(f"⚠️  Erreur compatibilité : {e}")

print("\n🎉 Script 04 terminé !")
