"""
Script 07 — ML KNN Recommandation de destinations
1. Pour chaque profil voyageur (Famille/Solo/Couple/Groupe/Éco)
2. KNN recommande les 5 meilleures gares destination
3. Sauvegarde dans gold.recommandations
"""

import sys, os, pickle, platform
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER','postgres')}:{os.getenv('DB_PASSWORD','00000')}"
        f"@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5434')}/{os.getenv('DB_NAME','tourisme_train')}"
    )

def get_model_path():
    if platform.system() == "Windows":
        return r"C:\Users\thili\Desktop\tourisme_train\models"
    return "/opt/airflow/models"

engine     = get_engine()
MODEL_PATH = get_model_path()
os.makedirs(MODEL_PATH, exist_ok=True)

print("=" * 60)
print("🤖 SCRIPT 07 — KNN Recommandation par profil voyageur")
print("=" * 60)

# ── ÉTAPE 1 : Chargement ────────────────────────────────────────
print("\n📥 Chargement des données Gold...")
df_gares  = pd.read_sql("SELECT * FROM gold.dim_gare", engine)
df_profils= pd.read_sql("SELECT * FROM gold.dim_profil", engine)
df_poi_e  = pd.read_sql("SELECT id_gare_1, categorie, distance_gare_km FROM silver.poi_enrichi", engine)
print(f"   {len(df_gares)} gares / {len(df_profils)} profils / {len(df_poi_e)} POI enrichis")

# ── ÉTAPE 2 : Feature Matrix par gare ───────────────────────────
print("\n🔧 Construction de la matrice features...")

# Compter POI par catégorie et gare
categories = ['Hébergement','Restauration','Culture','Patrimoine','Nature','Sport & Loisirs','Loisirs','Événement']

for cat in categories:
    col_name = f"nb_{cat.lower().replace(' ','_').replace('&','').replace('__','_')}"
    counts   = df_poi_e[(df_poi_e['categorie']==cat) & (df_poi_e['distance_gare_km']<=5)]\
                       .groupby('id_gare_1').size()
    df_gares[col_name] = df_gares['id'].map(counts).fillna(0).astype(int)

# Features finales
feature_cols = [
    f"nb_{c.lower().replace(' ','_').replace('&','').replace('__','_')}"
    for c in categories
] + ['nb_poi_5km', 'score_attractivite', 'nb_categories']

X = df_gares[feature_cols].fillna(0).values

scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── ÉTAPE 3 : Préférences par profil ────────────────────────────
# Pour chaque profil, construire un vecteur de préférences
PREFS_PROFIL = {
    "Famille": {
        "nb_hébergement"     : 3,
        "nb_restauration"    : 3,
        "nb_culture"         : 2,
        "nb_patrimoine"      : 1,
        "nb_nature"          : 3,
        "nb_sport_&_loisirs" : 3,
        "nb_loisirs"         : 3,
        "nb_événement"       : 2,
    },
    "Solo": {
        "nb_hébergement"     : 2,
        "nb_restauration"    : 2,
        "nb_culture"         : 4,
        "nb_patrimoine"      : 4,
        "nb_nature"          : 2,
        "nb_sport_&_loisirs" : 1,
        "nb_loisirs"         : 1,
        "nb_événement"       : 3,
    },
    "Couple": {
        "nb_hébergement"     : 3,
        "nb_restauration"    : 4,
        "nb_culture"         : 3,
        "nb_patrimoine"      : 3,
        "nb_nature"          : 3,
        "nb_sport_&_loisirs" : 1,
        "nb_loisirs"         : 2,
        "nb_événement"       : 2,
    },
    "Groupe": {
        "nb_hébergement"     : 2,
        "nb_restauration"    : 2,
        "nb_culture"         : 1,
        "nb_patrimoine"      : 1,
        "nb_nature"          : 2,
        "nb_sport_&_loisirs" : 4,
        "nb_loisirs"         : 4,
        "nb_événement"       : 4,
    },
    "Éco": {
        "nb_hébergement"     : 1,
        "nb_restauration"    : 1,
        "nb_culture"         : 2,
        "nb_patrimoine"      : 2,
        "nb_nature"          : 5,
        "nb_sport_&_loisirs" : 3,
        "nb_loisirs"         : 2,
        "nb_événement"       : 1,
    },
}

# ── ÉTAPE 4 : Entraîner KNN ─────────────────────────────────────
print("\n🧮 Entraînement du modèle KNN...")
knn = NearestNeighbors(n_neighbors=10, metric='cosine')
knn.fit(X_scaled)

# Sauvegarder le modèle
MODEL_FILE = os.path.join(MODEL_PATH, "knn_recommandation.pkl")
with open(MODEL_FILE, "wb") as f:
    pickle.dump({"knn": knn, "scaler": scaler, "feature_cols": feature_cols, "df_gares": df_gares}, f)
print(f"   💾 Modèle sauvegardé : {MODEL_FILE}")

# ── ÉTAPE 5 : Générer les recommandations ───────────────────────
print("\n🎯 Génération des recommandations...")

def construire_vecteur_profil(prefs_dict, feature_cols, max_vals):
    """Construit le vecteur de requête pour le KNN à partir des préférences."""
    vec = []
    for col in feature_cols:
        # Trouver la préférence correspondante
        score = 0
        for pref_key, pref_val in prefs_dict.items():
            if pref_key.replace('_','') in col.replace('_',''):
                score = pref_val
                break
        # Utiliser le score × max valeur observée pour la feature
        max_v = max_vals.get(col, 1)
        vec.append(score * max_v / 5.0)
    return np.array(vec)

max_vals = {col: df_gares[col].fillna(0).max() for col in feature_cols}

recommandations = []
print("\n📋 Top 5 destinations par profil :")

for _, profil in df_profils.iterrows():
    nom_profil = profil['nom']
    prefs      = PREFS_PROFIL.get(nom_profil, PREFS_PROFIL["Solo"])

    vec_profil = construire_vecteur_profil(prefs, feature_cols, max_vals)
    vec_scaled = scaler.transform([vec_profil])

    distances, indices = knn.kneighbors(vec_scaled, n_neighbors=min(10, len(df_gares)))

    print(f"\n   {profil['emoji']} {nom_profil} :")
    rang = 1
    for dist, idx in zip(distances[0], indices[0]):
        gare = df_gares.iloc[idx]
        score_reco = round(1 / (1 + dist) * 10, 2)

        # Construire la raison de recommandation
        raisons = []
        if gare['nb_poi_5km'] > 10: raisons.append(f"{gare['nb_poi_5km']} POI à 5km")
        if gare['nb_categories'] > 3: raisons.append(f"{gare['nb_categories']} types d'activités")
        if gare['score_attractivite'] > 5: raisons.append(f"Score attractivité {gare['score_attractivite']:.1f}/10")
        raison = " · ".join(raisons) if raisons else "Destination tranquille"

        recommandations.append({
            "id_profil"  : int(profil['id']),
            "id_gare"    : int(gare['id']),
            "rang"       : rang,
            "score_reco" : score_reco,
            "raison"     : raison,
            "nb_poi_match": int(gare['nb_poi_5km']),
        })
        print(f"      {rang}. {gare['nom_gare'].title():<25} (score: {score_reco}/10) — {raison}")
        rang += 1
        if rang > 5: break

# ── ÉTAPE 6 : Insertion ──────────────────────────────────────────
print("\n\n📤 Insertion dans gold.recommandations...")
df_reco = pd.DataFrame(recommandations)
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.recommandations RESTART IDENTITY"))
    conn.commit()
df_reco.to_sql('recommandations', engine, schema='gold', if_exists='append', index=False)
print(f"✅ {len(df_reco)} recommandations insérées")

print("\n🎉 Script 07 terminé !")
print("🏆 PIPELINE ML COMPLET !")
