"""
Script 05 — Couche Gold (Schéma en étoile pour Power BI)
1. Remplit toutes les tables de dimension (dim_*)
2. Remplit les tables de faits (fait_voyage, fait_co2)
3. Calcule les scores d'attractivité par gare
Résultat attendu : schéma étoile complet prêt pour Power BI
"""

import sys, os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from datetime import date, timedelta

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER','postgres')}:{os.getenv('DB_PASSWORD','00000')}"
        f"@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5434')}/{os.getenv('DB_NAME','tourisme_train')}"
    )

engine = get_engine()

print("=" * 60)
print("⭐ SCRIPT 05 — Couche Gold (Power BI Ready)")
print("=" * 60)

# ── DIM_REGION ──────────────────────────────────────────────────
print("\n[1/7] 🌍 dim_region...")
regions = [
    (1, "Pays de la Loire", "52", "Nantes",  5, 3870059, 32082),
    (2, "Île-de-France",    "11", "Paris",   8, 12213364, 12012),
    (3, "Bretagne",         "53", "Rennes",  4, 3380971, 27208),
    (4, "Normandie",        "28", "Rouen",   5, 3371882, 29907),
    (5, "Nouvelle-Aquitaine","75","Bordeaux",12, 6109762, 84036),
]
df_reg = pd.DataFrame(regions, columns=["id","nom_region","code_region","chef_lieu","nb_departements","population","superficie_km2"])
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.dim_region RESTART IDENTITY CASCADE"))
    conn.commit()
df_reg.to_sql('dim_region', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_reg)} régions")

# ── DIM_PROFIL ──────────────────────────────────────────────────
print("[2/7] 👤 dim_profil...")
profils = [
    (1, "Famille",  "Famille avec enfants, recherche activités variées",        150, 5,  3, "Nature,Sport,Loisirs,Culture",    "👨‍👩‍👧"),
    (2, "Solo",     "Voyageur solo, curieux et autonome",                         80, 10, 2, "Culture,Patrimoine,Gastronomie",  "🎒"),
    (3, "Couple",   "Couple sans enfant, romantique et gastronomique",           120, 8,  2, "Gastronomie,Patrimoine,Nature",   "💑"),
    (4, "Groupe",   "Groupe d'amis, ambiance festive et sportive",                60, 15, 1, "Sport,Loisirs,Aventure",          "🎉"),
    (5, "Éco",      "Voyageur éco-responsable, mobilité douce et nature",         50, 3,  2, "Nature,Vélo,Sport,Patrimoine",    "🌿"),
]
df_prof = pd.DataFrame(profils, columns=["id","nom","description","budget_jour_eur","distance_max_gare_km","duree_sejour_jours","preferences","emoji"])
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.dim_profil RESTART IDENTITY CASCADE"))
    conn.commit()
df_prof.to_sql('dim_profil', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_prof)} profils voyageurs")

# ── DIM_TRANSPORT ────────────────────────────────────────────────
print("[3/7] 🚆 dim_transport...")
transports = [
    (1, "Train",             "🚆", 2.4,   100, 0.10, 5),
    (2, "Voiture (seul)",    "🚗", 218.0,  90, 0.30, 1),
    (3, "Voiture (2 pers.)", "🚗", 109.0,  90, 0.15, 2),
    (4, "Avion",             "✈️",  258.0, 500, 0.15, 1),
    (5, "Bus",               "🚌", 103.0,  70, 0.05, 3),
    (6, "Vélo",              "🚲",   0.0,  15, 0.00, 5),
    (7, "Moto",              "🏍️", 191.0,  80, 0.15, 2),
]
df_trans = pd.DataFrame(transports, columns=["id","nom","emoji","co2_g_km","vitesse_moy_kmh","cout_moy_eur_km","eco_score"])
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.dim_transport RESTART IDENTITY CASCADE"))
    conn.commit()
df_trans.to_sql('dim_transport', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_trans)} modes de transport")

# ── DIM_TEMPS ────────────────────────────────────────────────────
print("[4/7] 📅 dim_temps (2024–2026)...")
MOIS_FR  = ["","Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
SAISONS  = {1:"Hiver",2:"Hiver",3:"Printemps",4:"Printemps",5:"Printemps",6:"Été",7:"Été",8:"Été",9:"Automne",10:"Automne",11:"Automne",12:"Hiver"}

dates    = pd.date_range("2024-01-01", "2026-12-31", freq="D")
df_temps = pd.DataFrame({
    "date_jour"  : dates,
    "annee"      : dates.year,
    "mois"       : dates.month,
    "nom_mois"   : [MOIS_FR[m] for m in dates.month],
    "trimestre"  : dates.quarter,
    "saison"     : [SAISONS[m] for m in dates.month],
    "est_weekend": dates.dayofweek >= 5,
    "est_vacances": False,
})
df_temps.index = range(1, len(df_temps) + 1)
df_temps.index.name = "id"
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.dim_temps RESTART IDENTITY CASCADE"))
    conn.commit()
df_temps.reset_index().to_sql('dim_temps', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_temps)} jours (2024-2026)")

# ── DIM_GARE ─────────────────────────────────────────────────────
print("[5/7] 🚉 dim_gare avec scores d'attractivité...")
df_gares_s = pd.read_sql("SELECT * FROM silver.gares", engine)
df_poi_s   = pd.read_sql("SELECT id_gare_1, distance_gare_km, categorie FROM silver.poi_enrichi", engine)

def normalize(s):
    mn, mx = s.min(), s.max()
    return (s - mn) / (mx - mn) if mx > mn else s * 0

# Calcul indicateurs par gare
poi_2km  = df_poi_s[df_poi_s['distance_gare_km']<=2].groupby('id_gare_1').size().rename('nb_2km')
poi_5km  = df_poi_s[df_poi_s['distance_gare_km']<=5].groupby('id_gare_1').size().rename('nb_5km')
poi_10km = df_poi_s[df_poi_s['distance_gare_km']<=10].groupby('id_gare_1').size().rename('nb_10km')
diversite= df_poi_s[df_poi_s['distance_gare_km']<=10].groupby('id_gare_1')['categorie'].nunique().rename('nb_cat')

df_dim_gare = df_gares_s.set_index('id').join(poi_2km).join(poi_5km).join(poi_10km).join(diversite)
df_dim_gare = df_dim_gare.fillna(0).reset_index()

# Score attractivité (0-10)
score  = (normalize(df_dim_gare['nb_2km']) * 0.30 +
          normalize(df_dim_gare['nb_5km']) * 0.25 +
          normalize(df_dim_gare['nb_10km'])* 0.15 +
          normalize(df_dim_gare['nb_cat']) * 0.20 +
          normalize(df_dim_gare['nb_voyageurs_annuel'].fillna(0)) * 0.10)
df_dim_gare['score_attractivite'] = (score * 10).round(2)

# Profil touristique selon score
def profil(s):
    if s >= 8:   return "Destination Premium"
    if s >= 6:   return "Forte attractivité"
    if s >= 4:   return "Attractivité moyenne"
    if s >= 2:   return "Faible attractivité"
    return "Gare de passage"

df_dim_gare['profil_touristique'] = df_dim_gare['score_attractivite'].apply(profil)

# Préparer pour insertion
df_gold_gare = pd.DataFrame({
    "id"                 : df_dim_gare['id'],
    "code_uic"           : df_dim_gare['code_uic'],
    "nom_gare"           : df_dim_gare['nom_gare'],
    "commune"            : df_dim_gare['commune'],
    "departement"        : df_dim_gare['departement'],
    "region"             : df_dim_gare['region'],
    "latitude"           : df_dim_gare['latitude'],
    "longitude"          : df_dim_gare['longitude'],
    "nb_poi_2km"         : df_dim_gare['nb_2km'].astype(int),
    "nb_poi_5km"         : df_dim_gare['nb_5km'].astype(int),
    "nb_poi_10km"        : df_dim_gare['nb_10km'].astype(int),
    "nb_categories"      : df_dim_gare['nb_cat'].astype(int),
    "nb_voyageurs_annuel": df_dim_gare['nb_voyageurs_annuel'].fillna(0).astype(int),
    "score_attractivite" : df_dim_gare['score_attractivite'],
    "profil_touristique" : df_dim_gare['profil_touristique'],
})

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.dim_gare RESTART IDENTITY CASCADE"))
    conn.commit()
df_gold_gare.to_sql('dim_gare', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_gold_gare)} gares scorées")
print(f"   Score moyen : {df_gold_gare['score_attractivite'].mean():.2f}/10")
print(f"   Top 5 :")
print(df_gold_gare.nlargest(5,'score_attractivite')[['nom_gare','score_attractivite','nb_poi_5km']].to_string(index=False))

# ── DIM_POI ──────────────────────────────────────────────────────
print("[6/7] 🏛️  dim_poi...")
df_poi_full = pd.read_sql("SELECT * FROM silver.poi", engine)
df_gold_poi = df_poi_full[['id','nom','categorie','sous_categorie','commune','departement','latitude','longitude']].copy()
df_gold_poi['cluster_nom']    = None
df_gold_poi['score_popularite'] = 0.0

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.dim_poi RESTART IDENTITY CASCADE"))
    conn.commit()
df_gold_poi.to_sql('dim_poi', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_gold_poi)} POI")

# ── FAIT_CO2 ──────────────────────────────────────────────────────
print("[7/7] 🌿 fait_co2 + fait_voyage...")
distances = list(range(50, 1050, 50))
co2_rows  = []
for d in distances:
    for t_id, t_nom, _, co2_km, *rest in transports:
        co2_tot = co2_km * d
        co2_voiture = 218.0 * d
        co2_rows.append({
            "id_transport"          : t_id,
            "id_region"             : 1,
            "distance_km"           : d,
            "co2_total_g"           : round(co2_tot, 1),
            "co2_par_km_g"          : co2_km,
            "economie_vs_voiture_g" : round(max(0, co2_voiture - co2_tot), 1),
            "economie_vs_avion_g"   : round(max(0, 258.0 * d - co2_tot), 1),
            "nb_arbres_equivalent"  : round(max(0, (co2_voiture - co2_tot)) / 21000, 3),
        })

df_co2 = pd.DataFrame(co2_rows)
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.fait_co2 RESTART IDENTITY CASCADE"))
    conn.commit()
df_co2.to_sql('fait_co2', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_co2)} lignes dans fait_co2")

# FAIT_VOYAGE — une ligne par combinaison gare × profil
villes_depart = [
    ("Paris",    2.3522, 48.8566, 200),
    ("Nantes",  -1.5534, 47.2184, 0),
    ("Le Mans",  0.1996, 48.0061, 80),
    ("Angers",  -0.5518, 47.4784, 90),
    ("Rennes",  -1.6743, 48.1147, 100),
]
df_gare_gold = pd.read_sql("SELECT id, nom_gare, latitude, longitude, nb_poi_2km, nb_poi_5km, nb_poi_10km, nb_categories, nb_voyageurs_annuel, score_attractivite FROM gold.dim_gare", engine)

import math
def dist_km(la1,lo1,la2,lo2):
    R=6371; la1,lo1,la2,lo2=map(math.radians,[la1,lo1,la2,lo2])
    return R*2*math.asin(math.sqrt(math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2))

fait_rows = []
id_temps_ete = pd.read_sql("SELECT id FROM gold.dim_temps WHERE saison='Été' AND est_weekend=true LIMIT 1", engine).iloc[0]['id']

for _, gare in df_gare_gold.iterrows():
    for dep_nom, dep_lon, dep_lat, _ in villes_depart:
        dist = dist_km(dep_lat, dep_lon, gare['latitude'], gare['longitude'])
        co2_t = round(2.4 * dist / 1000, 3)
        co2_v = round(218.0 * dist / 1000, 3)

        poi_q = pd.read_sql(f"""
            SELECT pe.categorie, COUNT(*) as n
            FROM silver.poi_enrichi pe
            WHERE pe.id_gare_1 = {int(gare['id'])} AND pe.distance_gare_km <= 5
            GROUP BY pe.categorie
        """, engine)
        nb_heb  = int(poi_q[poi_q['categorie']=='Hébergement']['n'].sum()) if len(poi_q) else 0
        nb_rest = int(poi_q[poi_q['categorie']=='Restauration']['n'].sum()) if len(poi_q) else 0
        nb_act  = int(poi_q[poi_q['categorie'].isin(['Sport & Loisirs','Nature','Culture'])]['n'].sum()) if len(poi_q) else 0

        for p_id, p_nom, *_ in profils:
            fait_rows.append({
                "id_gare"           : int(gare['id']),
                "id_profil"         : p_id,
                "id_region"         : 1,
                "id_temps"          : int(id_temps_ete),
                "distance_depart_km": round(dist, 1),
                "nb_poi_2km"        : int(gare['nb_poi_2km']),
                "nb_poi_5km"        : int(gare['nb_poi_5km']),
                "nb_poi_10km"       : int(gare['nb_poi_10km']),
                "nb_categories"     : int(gare['nb_categories']),
                "nb_hebergements"   : nb_heb,
                "nb_restaurants"    : nb_rest,
                "nb_activites"      : nb_act,
                "co2_train_kg"      : co2_t,
                "co2_voiture_kg"    : co2_v,
                "co2_economise_kg"  : round(max(0, co2_v - co2_t), 3),
                "score_attractivite": float(gare['score_attractivite']),
                "temps_trajet_min"  : int(dist / 100 * 60),
                "cout_billet_estime": round(dist * 0.10, 2),
            })

df_fait = pd.DataFrame(fait_rows)
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.fait_voyage RESTART IDENTITY CASCADE"))
    conn.commit()
df_fait.to_sql('fait_voyage', engine, schema='gold', if_exists='append', index=False)
print(f"   ✅ {len(df_fait)} lignes dans fait_voyage")

# ── Résumé ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("📋 RÉSUMÉ GOLD LAYER")
print("=" * 60)
tables_gold = ['dim_gare','dim_poi','dim_profil','dim_transport','dim_temps','dim_region','fait_voyage','fait_co2']
for t in tables_gold:
    nb = pd.read_sql(f"SELECT COUNT(*) as n FROM gold.{t}", engine).iloc[0]['n']
    print(f"   gold.{t:<25} → {nb:>7} lignes")

print("\n🎉 Script 05 terminé — Couche Gold prête pour Power BI !")
