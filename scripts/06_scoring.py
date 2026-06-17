import sys
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

engine = create_engine(
    f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

print("=" * 50)
print("🤖 SCRIPT 6 : Score touristique par gare (ML)")
print("=" * 50)

# --------------------------------
# ÉTAPE 1 — Charger les données
# --------------------------------
print("\n📥 Chargement des données...")

df_gares  = pd.read_sql("SELECT * FROM gares", engine)
df_poi    = pd.read_sql("SELECT * FROM poi_enrichi", engine)

print(f"✅ {len(df_gares)} gares / {len(df_poi)} POI enrichis")

# Fréquentation (optionnelle)
df_freq = pd.DataFrame()
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name='frequentation_gares'"))
        if result.fetchone():
            df_freq_raw = pd.read_sql("SELECT * FROM frequentation_gares", engine)
            if not df_freq_raw.empty and 'annee' in df_freq_raw.columns:
                derniere_annee = df_freq_raw['annee'].max()
                df_freq = (
                    df_freq_raw[df_freq_raw['annee'] == derniere_annee]
                    [['nom_gare', 'nb_voyageurs']]
                    .rename(columns={'nb_voyageurs': 'frequentation'})
                )
                print(f"✅ Fréquentation disponible ({derniere_annee}) : {len(df_freq)} gares")
except Exception as e:
    print(f"ℹ️ Fréquentation non disponible : {e}")

# --------------------------------
# ÉTAPE 2 — Calcul des indicateurs par gare
# --------------------------------
print("\n🔢 Calcul des indicateurs par gare...")

# Nombre de POI par distance
poi_2km  = df_poi[df_poi['distance_gare_km'] <= 2].groupby('nom_gare_proche').size().rename('nb_poi_2km')
poi_5km  = df_poi[df_poi['distance_gare_km'] <= 5].groupby('nom_gare_proche').size().rename('nb_poi_5km')
poi_10km = df_poi[df_poi['distance_gare_km'] <= 10].groupby('nom_gare_proche').size().rename('nb_poi_10km')

# Diversité des catégories (nombre de catégories différentes dans 10km)
diversite = (
    df_poi[df_poi['distance_gare_km'] <= 10]
    .groupby('nom_gare_proche')['categorie']
    .nunique()
    .rename('nb_categories')
)

# Assembler
df_score = df_gares[['nom_gare', 'commune', 'departement', 'latitude', 'longitude']].copy()
df_score = df_score.set_index('nom_gare')
df_score = df_score.join(poi_2km,  how='left')
df_score = df_score.join(poi_5km,  how='left')
df_score = df_score.join(poi_10km, how='left')
df_score = df_score.join(diversite, how='left')
df_score = df_score.fillna(0)

# Joindre la fréquentation si disponible
if not df_freq.empty:
    df_score = df_score.join(df_freq.set_index('nom_gare'), how='left')
    df_score['frequentation'] = df_score['frequentation'].fillna(0)
else:
    df_score['frequentation'] = 0

df_score = df_score.reset_index()

print(f"✅ Indicateurs calculés pour {len(df_score)} gares")

# --------------------------------
# ÉTAPE 3 — Calcul du score (0-100)
# --------------------------------
print("\n🎯 Calcul du score touristique...")

def normalize(series):
    """Normalise une série entre 0 et 1."""
    min_v = series.min()
    max_v = series.max()
    if max_v == min_v:
        return pd.Series([0.0] * len(series), index=series.index)
    return (series - min_v) / (max_v - min_v)

# Poids de chaque indicateur
POIDS = {
    'nb_poi_2km'    : 0.30,
    'nb_poi_5km'    : 0.25,
    'nb_poi_10km'   : 0.15,
    'nb_categories' : 0.20,
    'frequentation' : 0.10,
}

score = pd.Series(0.0, index=df_score.index)
for col, poids in POIDS.items():
    score += normalize(df_score[col]) * poids

df_score['score_touristique'] = (score * 100).round(1)

# --------------------------------
# ÉTAPE 4 — Clustering KMeans (si scikit-learn disponible)
# --------------------------------
try:
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler

    print("\n🤖 Clustering KMeans (5 profils de gares)...")

    features = df_score[['nb_poi_5km', 'nb_categories', 'frequentation', 'score_touristique']].copy()
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
    df_score['cluster'] = kmeans.fit_predict(X_scaled)

    labels = {
        df_score.groupby('cluster')['score_touristique'].mean().idxmax(): 'Destination Premium',
    }
    # Trier les clusters par score moyen pour assigner des labels
    cluster_scores = df_score.groupby('cluster')['score_touristique'].mean().sort_values(ascending=False)
    profils = ['Destination Premium', 'Forte attractivité', 'Attractivité moyenne', 'Faible attractivité', 'Gare de passage']
    label_map = {cluster: profil for cluster, profil in zip(cluster_scores.index, profils)}
    df_score['profil_touristique'] = df_score['cluster'].map(label_map)

    print("✅ Clusters créés :")
    print(df_score.groupby('profil_touristique')['score_touristique'].agg(['count', 'mean']).round(1).to_string())

except ImportError:
    print("ℹ️ scikit-learn non disponible — clustering désactivé")
    df_score['cluster']            = 0
    df_score['profil_touristique'] = 'Non calculé'

# --------------------------------
# ÉTAPE 5 — Statistiques finales
# --------------------------------
print(f"\n📊 Statistiques du score touristique :")
print(f"   Score moyen : {df_score['score_touristique'].mean():.1f}/100")
print(f"   Score max   : {df_score['score_touristique'].max():.1f}/100")

print(f"\n🏆 Top 20 gares les plus touristiques :")
top20 = df_score.nlargest(20, 'score_touristique')[
    ['nom_gare', 'commune', 'score_touristique', 'nb_poi_5km', 'nb_categories']
]
print(top20.to_string(index=False))

# --------------------------------
# ÉTAPE 6 — LOAD
# --------------------------------
print("\n📤 Envoi dans PostgreSQL...")
df_score.to_sql('score_touristique', engine, if_exists='replace', index=False)
print(f"✅ Table 'score_touristique' créée avec {len(df_score)} gares scorées !")
print("\n🎉 Script 6 terminé !")
print("\n🏆 PIPELINE COMPLET !")
