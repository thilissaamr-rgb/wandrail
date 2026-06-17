"""
Script 01 — Gares SNCF (Pays de la Loire)
1. Télécharge le CSV officiel SNCF depuis data.sncf.com
2. Filtre sur les 5 départements Pays de la Loire
3. Insère dans bronze.gares_raw puis silver.gares
Résultat attendu : ~100 gares voyageurs en PDL
"""

import sys, os, io, platform, time, requests
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

# ── Connexion et chemins ────────────────────────────────────────
def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER','postgres')}:{os.getenv('DB_PASSWORD','00000')}"
        f"@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5434')}/{os.getenv('DB_NAME','tourisme_train')}"
    )

def get_data_path():
    """Détecte automatiquement Windows ou Linux/Docker."""
    if platform.system() == "Windows":
        return r"C:\Users\thili\Desktop\tourisme_train\data\raw"
    return "/opt/airflow/data/raw"

engine    = get_engine()
DATA_PATH = get_data_path()
CSV_LOCAL = os.path.join(DATA_PATH, "liste-des-gares.csv")

# Départements Pays de la Loire
DEPTS_PDL = {
    "44": "Loire-Atlantique",
    "49": "Maine-et-Loire",
    "53": "Mayenne",
    "72": "Sarthe",
    "85": "Vendée",
}

# URLs SNCF Open Data
URL_GARES = (
    "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
    "referentiel-gares-voyageurs/exports/csv"
    "?delimiter=%3B&list_separator=%2C&quote_all=false&with_bom=true"
)
URL_FREQ = (
    "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/"
    "frequentation-gares/exports/csv?delimiter=%3B"
)

print("=" * 60)
print("🚉 SCRIPT 01 — Gares SNCF Pays de la Loire")
print("=" * 60)

# ── ÉTAPE 1 : Téléchargement ou lecture locale ──────────────────
os.makedirs(DATA_PATH, exist_ok=True)

besoin_refresh = (
    not os.path.exists(CSV_LOCAL) or
    (time.time() - os.path.getmtime(CSV_LOCAL)) > 7 * 86400
)

df_raw = None
if besoin_refresh:
    print("\n🔄 Téléchargement depuis SNCF Open Data...")
    try:
        r = requests.get(URL_GARES, timeout=60)
        r.raise_for_status()
        with open(CSV_LOCAL, "wb") as f:
            f.write(r.content)
        print("✅ Fichier mis à jour !")
    except Exception as e:
        print(f"⚠️  Impossible de télécharger ({e}) — on utilise le fichier local")
else:
    print("\n✅ Fichier local récent (< 7 jours)")

print("\n📥 Lecture du CSV...")
df_raw = pd.read_csv(CSV_LOCAL, sep=";", low_memory=False, encoding="utf-8-sig")
print(f"   {len(df_raw)} lignes brutes lues")
print(f"   Colonnes : {list(df_raw.columns[:6])}")

# ── ÉTAPE 2 : Bronze — insertion données brutes ─────────────────
print("\n📦 Bronze — insertion données brutes...")
df_bronze = df_raw.copy()
df_bronze.columns = [c.strip().lower().replace(" ","_").replace("(","").replace(")","") for c in df_bronze.columns]

# Identifier les colonnes importantes
cols = df_bronze.columns.tolist()
col_uic  = next((c for c in cols if 'uic' in c), cols[0])
col_lib  = next((c for c in cols if 'libelle' in c or 'intitule' in c or 'nom' in c), cols[1])
col_voy  = next((c for c in cols if 'voyageur' in c), None)
col_com  = next((c for c in cols if 'commune' in c), None)
col_dep  = next((c for c in cols if 'depart' in c), None)
col_lon  = next((c for c in cols if 'lon' in c or 'x_wgs' in c), None)
col_lat  = next((c for c in cols if 'lat' in c or 'y_wgs' in c), None)

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE bronze.gares_raw RESTART IDENTITY"))
    for _, row in df_raw.iterrows():
        conn.execute(text("""
            INSERT INTO bronze.gares_raw (code_uic, libelle, commune, departement,
                                          voyageurs, longitude_raw, latitude_raw, source_fichier)
            VALUES (:uic, :lib, :com, :dep, :voy, :lon, :lat, :src)
        """), {
            "uic": str(row.get(col_uic, "") or ""),
            "lib": str(row.get(col_lib, "") or ""),
            "com": str(row.get(col_com, "") or ""),
            "dep": str(row.get(col_dep, "") or ""),
            "voy": str(row.get(col_voy, "") or "") if col_voy else "",
            "lon": str(row.get(col_lon, "") or "") if col_lon else "",
            "lat": str(row.get(col_lat, "") or "") if col_lat else "",
            "src": CSV_LOCAL,
        })
    conn.commit()
print(f"   ✅ {len(df_raw)} lignes dans bronze.gares_raw")

# ── ÉTAPE 3 : Téléchargement fréquentation ──────────────────────
print("\n📊 Téléchargement fréquentation gares...")
df_freq = pd.DataFrame()
try:
    r2 = requests.get(URL_FREQ, timeout=60)
    r2.raise_for_status()
    df_freq = pd.read_csv(io.StringIO(r2.text), sep=";", low_memory=False, encoding="utf-8-sig")
    print(f"   ✅ {len(df_freq)} lignes fréquentation")

    # Identifier colonnes
    cols_f = {c.lower().strip(): c for c in df_freq.columns}
    col_f_nom = next((cols_f[k] for k in cols_f if 'nom' in k and 'gare' in k), None)
    col_f_voy = next((cols_f[k] for k in cols_f if 'voyageur' in k and 'non' not in k
                      and ('2023' in k or '2022' in k)), None)
    if not col_f_voy:
        col_f_voy = next((cols_f[k] for k in cols_f if 'voyageur' in k and 'non' not in k), None)
    print(f"   Colonne voyageurs utilisée : {col_f_voy}")

except Exception as e:
    print(f"   ⚠️  Fréquentation non disponible : {e}")

# ── ÉTAPE 4 : Silver — nettoyage et filtrage PDL ────────────────
print("\n🔪 Silver — nettoyage et filtrage Pays de la Loire...")

df_clean = df_raw.copy()
df_clean.columns = [c.strip() for c in df_clean.columns]

# Renommer les colonnes
rename = {}
for c in df_clean.columns:
    cl = c.lower().strip()
    if 'uic' in cl:            rename[c] = 'CODE_UIC'
    elif 'libelle' in cl or 'intitule' in cl: rename[c] = 'LIBELLE'
    elif 'voyageur' in cl:     rename[c] = 'VOYAGEURS'
    elif 'commune' in cl:      rename[c] = 'COMMUNE'
    elif 'depart' in cl:       rename[c] = 'DEPARTEMENT'
    elif 'lon' in cl or 'x_wgs' in cl: rename[c] = 'LONGITUDE'
    elif 'lat' in cl or 'y_wgs' in cl: rename[c] = 'LATITUDE'

df_clean = df_clean.rename(columns=rename)

# Filtrer gares voyageurs
if 'VOYAGEURS' in df_clean.columns:
    df_clean = df_clean[df_clean['VOYAGEURS'].astype(str).str.upper().isin(['O', 'OUI', '1', 'TRUE'])]

# Convertir coordonnées
df_clean['LATITUDE']  = pd.to_numeric(df_clean.get('LATITUDE',  pd.Series()), errors='coerce')
df_clean['LONGITUDE'] = pd.to_numeric(df_clean.get('LONGITUDE', pd.Series()), errors='coerce')
df_clean = df_clean.dropna(subset=['LATITUDE', 'LONGITUDE'])

# Extraire code département depuis CODE_UIC ou DEPARTEMENT
def extraire_dept(row):
    dep = str(row.get('DEPARTEMENT', '') or '').strip()
    if dep and dep.isdigit() and len(dep) <= 3:
        return dep.zfill(2)
    # Chercher dans le nom de commune
    return ""

df_clean['CODE_DEPT'] = df_clean.apply(extraire_dept, axis=1)

# Filtre géographique Pays de la Loire (bbox)
avant = len(df_clean)
df_pdl = df_clean[
    (df_clean['LATITUDE'].between(46.3, 48.4)) &
    (df_clean['LONGITUDE'].between(-2.6, 1.0))
].copy()
print(f"   Filtre géo PDL : {avant} → {len(df_pdl)} gares")

if len(df_pdl) == 0:
    print("   ⚠️  Filtre géo trop strict — on prend toute la France en fallback")
    df_pdl = df_clean[
        (df_clean['LATITUDE'].between(41, 52)) &
        (df_clean['LONGITUDE'].between(-5, 10))
    ].copy()
    print(f"   France entière : {len(df_pdl)} gares")

# Nettoyage textes
for col in ['LIBELLE', 'COMMUNE', 'DEPARTEMENT']:
    if col in df_pdl.columns:
        df_pdl[col] = df_pdl[col].astype(str).str.strip().str.lower()

df_pdl = df_pdl.drop_duplicates(subset=['LIBELLE', 'COMMUNE'])

# Déterminer région depuis coordonnées
df_pdl['REGION'] = 'Pays de la Loire'

# Ajouter fréquentation si disponible
df_pdl['NB_VOYAGEURS'] = 0
if not df_freq.empty and col_f_nom and col_f_voy:
    freq_dict = dict(zip(
        df_freq[col_f_nom].astype(str).str.strip().str.lower(),
        pd.to_numeric(df_freq[col_f_voy], errors='coerce').fillna(0).astype(int)
    ))
    df_pdl['NB_VOYAGEURS'] = df_pdl['LIBELLE'].map(freq_dict).fillna(0).astype(int)
    nb_avec_freq = (df_pdl['NB_VOYAGEURS'] > 0).sum()
    print(f"   Fréquentation ajoutée pour {nb_avec_freq}/{len(df_pdl)} gares")

print(f"\n✅ {len(df_pdl)} gares Pays de la Loire prêtes")
print(df_pdl[['LIBELLE', 'COMMUNE', 'LATITUDE', 'LONGITUDE']].head(5).to_string())

# ── ÉTAPE 5 : Insertion Silver ──────────────────────────────────
print("\n📤 Insertion dans silver.gares...")
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE silver.gares RESTART IDENTITY CASCADE"))
    for _, row in df_pdl.iterrows():
        conn.execute(text("""
            INSERT INTO silver.gares
              (code_uic, nom_gare, commune, departement, region,
               latitude, longitude, type_gare, nb_voyageurs_annuel)
            VALUES (:uic, :nom, :com, :dep, :reg, :lat, :lon, :type, :voy)
        """), {
            "uic" : str(row.get('CODE_UIC', '') or ''),
            "nom" : str(row.get('LIBELLE', '') or ''),
            "com" : str(row.get('COMMUNE', '') or ''),
            "dep" : str(row.get('DEPARTEMENT', '') or ''),
            "reg" : str(row.get('REGION', 'Pays de la Loire')),
            "lat" : float(row['LATITUDE']),
            "lon" : float(row['LONGITUDE']),
            "type": "Voyageurs",
            "voy" : int(row.get('NB_VOYAGEURS', 0)),
        })
    conn.commit()

nb = pd.read_sql("SELECT COUNT(*) as n FROM silver.gares", engine).iloc[0]['n']
print(f"✅ {nb} gares dans silver.gares")
print("\n🎉 Script 01 terminé !")
