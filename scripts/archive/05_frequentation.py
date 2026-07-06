import sys
import pandas as pd
import requests
import io
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
print("📊 SCRIPT 5 : Fréquentation des gares SNCF")
print("=" * 50)

# --------------------------------
# ÉTAPE 1 — Téléchargement des données SNCF Open Data
# --------------------------------
print("\n📥 Téléchargement fréquentation gares depuis SNCF Open Data...")

URL_FREQ = (
    "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
    "frequentation-gares/exports/csv?delimiter=%3B&list_separator=%2C&quote_all=false&with_bom=true"
)

df = None
try:
    r = requests.get(URL_FREQ, timeout=60)
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text), sep=";", low_memory=False)
    print(f"✅ {len(df)} lignes téléchargées !")
    print(f"   Colonnes : {list(df.columns[:8])}")
except Exception as e:
    print(f"❌ Erreur téléchargement : {e}")
    exit()

# --------------------------------
# ÉTAPE 2 — Identifier les colonnes dynamiquement
# --------------------------------
cols_lower = {c.lower().strip(): c for c in df.columns}

# Trouver le code UIC
col_uic = None
for candidate in ['code_uic_complet', 'code uic', 'code_uic', 'uic']:
    if candidate in cols_lower:
        col_uic = cols_lower[candidate]
        break

# Trouver le nom de la gare
col_nom = None
for candidate in ['nom_de_la_gare', 'nom_gare', 'nom de la gare', 'gare']:
    if candidate in cols_lower:
        col_nom = cols_lower[candidate]
        break

# Trouver les colonnes de voyageurs (on prend la plus récente disponible)
voyageurs_cols = [c for c in df.columns if 'voyageur' in c.lower() and 'non' not in c.lower()]
print(f"   Colonnes voyageurs trouvées : {voyageurs_cols}")

if not col_uic or not col_nom or not voyageurs_cols:
    print(f"⚠️ Colonnes manquantes. Colonnes disponibles : {list(df.columns)}")
    print("   Création d'une table fréquentation basique...")
    df_freq = df.copy()
    df_freq.columns = [c.lower().replace(' ', '_').replace('(', '').replace(')', '') for c in df_freq.columns]
else:
    # --------------------------------
    # ÉTAPE 3 — TRANSFORM : Restructurer en format long
    # --------------------------------
    print("\n🔪 Restructuration des données...")

    records = []
    for _, row in df.iterrows():
        code_uic = str(row[col_uic]).strip() if col_uic else ""
        nom_gare = str(row[col_nom]).strip().lower() if col_nom else ""

        for col_v in voyageurs_cols:
            annee = None
            for part in str(col_v).split('_'):
                if part.isdigit() and len(part) == 4:
                    annee = int(part)
                    break
            if annee is None:
                continue

            try:
                nb = int(str(row[col_v]).replace(' ', '').replace(',', ''))
            except (ValueError, TypeError):
                continue

            if nb > 0:
                records.append({
                    "code_uic"   : code_uic,
                    "nom_gare"   : nom_gare,
                    "annee"      : annee,
                    "nb_voyageurs": nb,
                })

    df_freq = pd.DataFrame(records)
    print(f"✅ {len(df_freq)} enregistrements extraits")

    if not df_freq.empty:
        print(f"   Années disponibles : {sorted(df_freq['annee'].unique())}")
        print(f"   Gares : {df_freq['nom_gare'].nunique()}")

        # Ajouter le rang de fréquentation par année
        df_freq['rang_frequentation'] = df_freq.groupby('annee')['nb_voyageurs'].rank(
            ascending=False, method='min'
        ).astype(int)

        # Top 10 gares les plus fréquentées (dernière année disponible)
        derniere_annee = df_freq['annee'].max()
        top10 = (
            df_freq[df_freq['annee'] == derniere_annee]
            .nlargest(10, 'nb_voyageurs')[['nom_gare', 'nb_voyageurs']]
        )
        print(f"\n🏆 Top 10 gares {derniere_annee} :")
        print(top10.to_string(index=False))

# --------------------------------
# ÉTAPE 4 — LOAD
# --------------------------------
print("\n📤 Envoi dans PostgreSQL...")
df_freq.to_sql('frequentation_gares', engine, if_exists='replace', index=False)
print(f"✅ Table 'frequentation_gares' créée avec {len(df_freq)} lignes !")
print("\n🎉 Script 5 terminé !")
