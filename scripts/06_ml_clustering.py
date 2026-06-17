"""
Script 06 — ML KMeans Clustering des POI
1. KMeans (5 clusters) sur les POI en Pays de la Loire
2. Nomme les clusters : Nature, Culture, Gastronomie, Aventure, Patrimoine
3. Sauvegarde dans gold.poi_clusters et met à jour gold.dim_poi
Métriques attendues : Silhouette Score > 0.4
"""

import sys, os, pickle, platform
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import silhouette_score

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
print("🤖 SCRIPT 06 — KMeans Clustering des POI (5 clusters)")
print("=" * 60)

# ── ÉTAPE 1 : Chargement ────────────────────────────────────────
print("\n📥 Chargement des POI depuis silver.poi...")
df = pd.read_sql("SELECT id, nom, categorie, commune, latitude, longitude FROM silver.poi WHERE latitude IS NOT NULL", engine)
print(f"   ✅ {len(df)} POI chargés")

if len(df) < 50:
    print("❌ Pas assez de POI pour le clustering")
    exit(1)

# ── ÉTAPE 2 : Feature Engineering ──────────────────────────────
print("\n🔧 Préparation des features...")

# Encoder la catégorie en numérique
le = LabelEncoder()
df['cat_encoded'] = le.fit_transform(df['categorie'].fillna('Autre'))

# Features : latitude, longitude, catégorie encodée
X = df[['latitude', 'longitude', 'cat_encoded']].copy()

# Normalisation
scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── ÉTAPE 3 : KMeans ────────────────────────────────────────────
print("\n🧮 KMeans clustering (5 clusters)...")
N_CLUSTERS = 5

kmeans = KMeans(
    n_clusters=N_CLUSTERS,
    random_state=42,
    n_init=20,
    max_iter=300
)
labels = kmeans.fit_predict(X_scaled)
df['cluster_id'] = labels

# Score silhouette
sample_size = min(5000, len(df))
sil_score   = silhouette_score(X_scaled[:sample_size], labels[:sample_size])
print(f"   Silhouette Score : {sil_score:.4f} {'✅ (>0.3)' if sil_score > 0.3 else '⚠️ (<0.3)'}")

# ── ÉTAPE 4 : Nommage des clusters ──────────────────────────────
print("\n🏷️  Identification et nommage des clusters...")

# Analyser les catégories dominantes par cluster
cluster_info = {}
for c_id in range(N_CLUSTERS):
    mask     = df['cluster_id'] == c_id
    cats     = df[mask]['categorie'].value_counts()
    top_cat  = cats.index[0] if len(cats) > 0 else "Autre"
    avg_lat  = df[mask]['latitude'].mean()
    avg_lon  = df[mask]['longitude'].mean()
    cluster_info[c_id] = {
        "top_categorie": top_cat,
        "nb_poi"       : mask.sum(),
        "avg_lat"       : round(avg_lat, 4),
        "avg_lon"       : round(avg_lon, 4),
        "categories"   : cats.head(5).to_dict(),
    }
    print(f"   Cluster {c_id} ({mask.sum()} POI) — top : {top_cat}")

# Mapping automatique basé sur la catégorie dominante
NOMS_CLUSTERS = {}
CAT_TO_THEME  = {
    "Nature"        : ("Nature",        "#2ecc71", "🌿"),
    "Culture"       : ("Culture",       "#9b59b6", "🎭"),
    "Patrimoine"    : ("Patrimoine",    "#e67e22", "🏰"),
    "Restauration"  : ("Gastronomie",   "#e74c3c", "🍽️"),
    "Hébergement"   : ("Hébergement",   "#3498db", "🏨"),
    "Sport & Loisirs": ("Aventure",     "#f39c12", "⚽"),
    "Loisirs"       : ("Aventure",      "#f39c12", "🎢"),
    "Événement"     : ("Événements",    "#1abc9c", "🎪"),
    "Commerce"      : ("Commerce",      "#95a5a6", "🛍️"),
    "Service"       : ("Services",      "#7f8c8d", "ℹ️"),
    "Autre"         : ("Divers",        "#bdc3c7", "📍"),
}

noms_utilises = set()
for c_id, info in cluster_info.items():
    top_cat = info["top_categorie"]
    nom, couleur, emoji = CAT_TO_THEME.get(top_cat, ("Divers", "#bdc3c7", "📍"))
    # Éviter les doublons de noms
    if nom in noms_utilises:
        nom = f"{nom} {c_id+1}"
    noms_utilises.add(nom)
    NOMS_CLUSTERS[c_id] = (nom, couleur, emoji)

print(f"\n   Clusters nommés :")
for c_id, (nom, couleur, emoji) in NOMS_CLUSTERS.items():
    print(f"   {emoji} Cluster {c_id} → {nom} ({cluster_info[c_id]['nb_poi']} POI)")

# ── ÉTAPE 5 : Sauvegarde modèle ─────────────────────────────────
MODEL_FILE = os.path.join(MODEL_PATH, "kmeans_poi.pkl")
with open(MODEL_FILE, "wb") as f:
    pickle.dump({"kmeans": kmeans, "scaler": scaler, "le": le, "noms": NOMS_CLUSTERS}, f)
print(f"\n💾 Modèle sauvegardé : {MODEL_FILE}")

# ── ÉTAPE 6 : Insertion dans gold.poi_clusters ──────────────────
print("\n📤 Insertion dans gold.poi_clusters...")

# Calculer le score d'appartenance (distance au centroïde, normalisée)
distances_centroides = kmeans.transform(X_scaled)
scores_app = 1 / (1 + np.min(distances_centroides, axis=1))  # Plus proche = score plus élevé

df['cluster_nom']       = df['cluster_id'].map(lambda x: NOMS_CLUSTERS[x][0])
df['cluster_couleur']   = df['cluster_id'].map(lambda x: NOMS_CLUSTERS[x][1])
df['score_appartenance'] = np.round(scores_app, 4)

# Récupérer les IDs gold.dim_poi
df_dim_poi = pd.read_sql("SELECT id FROM gold.dim_poi ORDER BY id", engine)
df_sorted  = df.sort_values('id').reset_index(drop=True)

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE gold.poi_clusters RESTART IDENTITY"))
    conn.commit()

clusters_rows = []
for i, row in df_sorted.iterrows():
    if i < len(df_dim_poi):
        clusters_rows.append({
            "id_poi"            : int(df_dim_poi.iloc[i]['id']),
            "cluster_id"        : int(row['cluster_id']),
            "cluster_nom"       : row['cluster_nom'],
            "cluster_couleur"   : row['cluster_couleur'],
            "score_appartenance": float(row['score_appartenance']),
        })

pd.DataFrame(clusters_rows).to_sql('poi_clusters', engine, schema='gold', if_exists='append', index=False)

# Mettre à jour gold.dim_poi avec le cluster
with engine.connect() as conn:
    for i, row in df_sorted.iterrows():
        if i < len(df_dim_poi):
            conn.execute(text("""
                UPDATE gold.dim_poi SET cluster_nom = :nom, score_popularite = :score
                WHERE id = :id
            """), {
                "nom"  : row['cluster_nom'],
                "score": float(row['score_appartenance']),
                "id"   : int(df_dim_poi.iloc[i]['id']),
            })
    conn.commit()

# ── Résumé ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("📊 RÉSUMÉ CLUSTERING")
print("=" * 60)
print(f"   Silhouette Score   : {sil_score:.4f}")
print(f"   Nombre de clusters : {N_CLUSTERS}")
print(f"   POI clusterisés    : {len(df)}")
print("\n   Répartition :")
for c_id, (nom, couleur, emoji) in NOMS_CLUSTERS.items():
    nb = (df['cluster_id'] == c_id).sum()
    pct = nb / len(df) * 100
    print(f"   {emoji} {nom:<20} : {nb:>5} POI ({pct:.1f}%)")

print("\n🎉 Script 06 terminé !")
