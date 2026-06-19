"""
Script 01 - Gares SNCF (Pays de la Loire)
------------------------------------------
Etapes :
  1. Telecharge le CSV officiel SNCF depuis data.sncf.com
  2. Filtre sur les 5 departements Pays de la Loire (44, 49, 53, 72, 85)
  3. Recupere les donnees de frequentation annuelle
  4. Insere dans bronze.gares_raw puis silver.gares

Resultat attendu : environ 80-100 gares voyageurs en PDL
"""

import sys
import os
import io
import time
import platform
import requests
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()


# -- Connexion base de donnees -----------------------------------------------

def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '00000')}"
        f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5434')}"
        f"/{os.getenv('DB_NAME', 'tourisme_train')}"
    )


def get_data_path():
    local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw"))
    if os.path.exists(local_path):
        return local_path
    return "/opt/airflow/data/raw"


engine    = get_engine()
DATA_PATH = get_data_path()
CSV_LOCAL = os.path.join(DATA_PATH, "liste-des-gares.csv")

# Codes departement des 5 departements Pays de la Loire
CODES_DEPT_PDL = {"44", "49", "53", "72", "85"}

# Mapping : nom de departement dans la colonne DEPARTEMEN -> code dept
# Le CSV SNCF stocke le nom en majuscules sans accent (ex: "VENDEE" et non "VENDEE")
NOMS_DEPT_PDL = {
    "LOIRE-ATLANTIQUE": "44",
    "MAINE-ET-LOIRE":   "49",
    "MAYENNE":          "53",
    "SARTHE":           "72",
    "VENDEE":           "85",
    "VENDÉE":      "85",  # forme avec accent si presente
}

# Noms correspondants pour l'affichage et l'enrichissement
NOM_DEPT = {
    "44": "Loire-Atlantique",
    "49": "Maine-et-Loire",
    "53": "Mayenne",
    "72": "Sarthe",
    "85": "Vendee",
}

# Bounding box geographique PDL (validation complementaire)
LAT_MIN, LAT_MAX = 46.3, 48.4
LON_MIN, LON_MAX = -2.6,  1.0

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
print("SCRIPT 01 - Gares SNCF Pays de la Loire")
print("=" * 60)


# -- Etape 1 : Telechargement ou lecture locale --------------------------------

os.makedirs(DATA_PATH, exist_ok=True)

besoin_refresh = (
    not os.path.exists(CSV_LOCAL)
    or (time.time() - os.path.getmtime(CSV_LOCAL)) > 7 * 86400
)

if besoin_refresh:
    print("\nTelechargement depuis SNCF Open Data...")
    try:
        r = requests.get(URL_GARES, timeout=60)
        r.raise_for_status()
        with open(CSV_LOCAL, "wb") as f:
            f.write(r.content)
        print("Fichier mis a jour.")
    except Exception as e:
        print(f"Impossible de telecharger ({e}) - utilisation du fichier local existant.")
else:
    print("\nFichier local recent (< 7 jours) - pas de telechargement.")

print("\nLecture du CSV...")
df_raw = pd.read_csv(CSV_LOCAL, sep=";", low_memory=False, encoding="utf-8-sig")
print(f"  {len(df_raw)} lignes brutes lues")
print(f"  Colonnes disponibles : {list(df_raw.columns[:8])}")


# -- Etape 2 : Bronze - insertion donnees brutes --------------------------------

print("\nBronze - insertion donnees brutes...")
df_bronze = df_raw.copy()
df_bronze.columns = [
    c.strip().lower().replace(" ", "_").replace("(", "").replace(")", "")
    for c in df_bronze.columns
]

cols = df_bronze.columns.tolist()
col_uic = next((c for c in cols if "uic" in c), cols[0])
col_lib = next((c for c in cols if "libelle" in c or "intitule" in c or "nom" in c), cols[1])
col_voy = next((c for c in cols if "voyageur" in c), None)
col_com = next((c for c in cols if "commune" in c), None)
col_dep = next((c for c in cols if "depart" in c), None)
col_lon = next((c for c in cols if "lon" in c or "x_wgs" in c), None)
col_lat = next((c for c in cols if "lat" in c or "y_wgs" in c), None)

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE bronze.gares_raw RESTART IDENTITY"))
    for _, row in df_raw.iterrows():
        conn.execute(text("""
            INSERT INTO bronze.gares_raw
              (code_uic, libelle, commune, departement, voyageurs,
               longitude_raw, latitude_raw, source_fichier)
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

print(f"  {len(df_raw)} lignes dans bronze.gares_raw")


# -- Etape 3 : Telechargement frequentation ------------------------------------

print("\nTelechargement frequentation gares SNCF...")
df_freq    = pd.DataFrame()
col_f_nom  = None
col_f_voy  = None

try:
    r2 = requests.get(URL_FREQ, timeout=60)
    r2.raise_for_status()
    df_freq = pd.read_csv(io.StringIO(r2.text), sep=";", low_memory=False, encoding="utf-8-sig")
    print(f"  {len(df_freq)} lignes frequentation recuperees")

    cols_f = {c.lower().strip(): c for c in df_freq.columns}
    col_f_nom = next((cols_f[k] for k in cols_f if "nom" in k and "gare" in k), None)
    col_f_voy = next(
        (cols_f[k] for k in cols_f
         if "voyageur" in k and "non" not in k and ("2023" in k or "2022" in k)),
        None
    )
    if not col_f_voy:
        col_f_voy = next(
            (cols_f[k] for k in cols_f if "voyageur" in k and "non" not in k),
            None
        )
    print(f"  Colonne frequentation utilisee : {col_f_voy}")

except Exception as e:
    print(f"  Frequentation non disponible : {e}")


# -- Etape 4 : Silver - nettoyage et filtrage PDL ------------------------------

print("\nSilver - nettoyage et filtrage Pays de la Loire...")

df_clean = df_raw.copy()
df_clean.columns = [c.strip() for c in df_clean.columns]

# Renommage standardise des colonnes
rename = {}
for c in df_clean.columns:
    cl = c.lower().strip()
    if "uic" in cl:
        rename[c] = "CODE_UIC"
    elif "libelle" in cl or "intitule" in cl:
        rename[c] = "LIBELLE"
    elif "voyageur" in cl:
        rename[c] = "VOYAGEURS"
    elif "commune" in cl:
        rename[c] = "COMMUNE"
    elif "depart" in cl:
        rename[c] = "DEPARTEMENT"
    elif "lon" in cl or "x_wgs" in cl:
        rename[c] = "LONGITUDE"
    elif "lat" in cl or "y_wgs" in cl:
        rename[c] = "LATITUDE"

df_clean = df_clean.rename(columns=rename)

# Garder uniquement les gares ouvertes aux voyageurs
if "VOYAGEURS" in df_clean.columns:
    df_clean = df_clean[
        df_clean["VOYAGEURS"].astype(str).str.upper().isin(["O", "OUI", "1", "TRUE"])
    ]

# Conversion coordonnees GPS
df_clean["LATITUDE"]  = pd.to_numeric(df_clean.get("LATITUDE",  pd.Series()), errors="coerce")
df_clean["LONGITUDE"] = pd.to_numeric(df_clean.get("LONGITUDE", pd.Series()), errors="coerce")
df_clean = df_clean.dropna(subset=["LATITUDE", "LONGITUDE"])


def extraire_code_dept(row):
    """
    Extrait le code departement depuis la colonne DEPARTEMENT (nom en majuscules).
    La colonne DEPARTEMEN du CSV SNCF contient le nom du departement en clair
    (ex: "LOIRE-ATLANTIQUE"), pas le code numerique.
    Les codes UIC SNCF (87XXXXXX) n'encodent pas le departement dans leurs chiffres.
    """
    dep_raw = str(row.get("DEPARTEMENT", "") or "").strip().upper()

    # Correspondance exacte
    if dep_raw in NOMS_DEPT_PDL:
        return NOMS_DEPT_PDL[dep_raw]

    # Correspondance partielle (ex: "VENDEE (85)" ou "LOIRE ATLANTIQUE")
    for nom, code in NOMS_DEPT_PDL.items():
        if nom in dep_raw:
            return code

    return ""


df_clean["CODE_DEPT"] = df_clean.apply(extraire_code_dept, axis=1)

# -- Filtre principal : nom de departement PDL (colonne DEPARTEMENT du CSV)
avant = len(df_clean)
df_pdl = df_clean[df_clean["CODE_DEPT"].isin(CODES_DEPT_PDL)].copy()
print(f"  Filtre departement PDL (nom) : {avant} -> {len(df_pdl)} gares")

# Validation geographique : eliminer les rares cas hors bbox
# (gares frontieres parfois rattachees administrativement a un autre dept)
nb_avant_geo = len(df_pdl)
df_pdl = df_pdl[
    (df_pdl["LATITUDE"].between(LAT_MIN, LAT_MAX))
    & (df_pdl["LONGITUDE"].between(LON_MIN, LON_MAX))
].copy()
if nb_avant_geo != len(df_pdl):
    print(f"  Apres validation bbox : {len(df_pdl)} gares ({nb_avant_geo - len(df_pdl)} ecartees hors PDL)")

# Nettoyage des textes
for col in ["LIBELLE", "COMMUNE"]:
    if col in df_pdl.columns:
        df_pdl[col] = df_pdl[col].astype(str).str.strip().str.lower()

# Enrichissement du nom de departement
df_pdl["NOM_DEPT"] = df_pdl["CODE_DEPT"].map(NOM_DEPT).fillna("Pays de la Loire")

df_pdl["REGION"] = "Pays de la Loire"

# Suppression des doublons sur nom + commune
df_pdl = df_pdl.drop_duplicates(subset=["LIBELLE", "COMMUNE"])
print(f"  Apres deduplication : {len(df_pdl)} gares")

# Ajout de la frequentation annuelle
df_pdl["NB_VOYAGEURS"] = 0
if not df_freq.empty and col_f_nom and col_f_voy:
    freq_dict = dict(zip(
        df_freq[col_f_nom].astype(str).str.strip().str.lower(),
        pd.to_numeric(df_freq[col_f_voy], errors="coerce").fillna(0).astype(int)
    ))
    df_pdl["NB_VOYAGEURS"] = df_pdl["LIBELLE"].map(freq_dict).fillna(0).astype(int)
    nb_avec_freq = (df_pdl["NB_VOYAGEURS"] > 0).sum()
    print(f"  Frequentation disponible pour {nb_avec_freq}/{len(df_pdl)} gares")

print(f"\n  {len(df_pdl)} gares Pays de la Loire retenues")
print(df_pdl[["LIBELLE", "COMMUNE", "CODE_DEPT", "LATITUDE", "LONGITUDE"]].head(8).to_string())


# -- Etape 5 : Insertion Silver ------------------------------------------------

print("\nInsertion dans silver.gares...")
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE silver.gares RESTART IDENTITY CASCADE"))
    for _, row in df_pdl.iterrows():
        conn.execute(text("""
            INSERT INTO silver.gares
              (code_uic, nom_gare, commune, departement, code_departement,
               region, latitude, longitude, type_gare, nb_voyageurs_annuel)
            VALUES (:uic, :nom, :com, :dep, :cdep, :reg, :lat, :lon, :type, :voy)
        """), {
            "uic" : str(row.get("CODE_UIC", "") or ""),
            "nom" : str(row.get("LIBELLE", "") or ""),
            "com" : str(row.get("COMMUNE", "") or ""),
            "dep" : str(row.get("NOM_DEPT", "") or ""),
            "cdep": str(row.get("CODE_DEPT", "") or ""),
            "reg" : "Pays de la Loire",
            "lat" : float(row["LATITUDE"]),
            "lon" : float(row["LONGITUDE"]),
            "type": "Voyageurs",
            "voy" : int(row.get("NB_VOYAGEURS", 0)),
        })
    conn.commit()

nb = pd.read_sql("SELECT COUNT(*) as n FROM silver.gares", engine).iloc[0]["n"]

# Verification : repartition par departement
dept_check = pd.read_sql(
    "SELECT code_departement, COUNT(*) as nb FROM silver.gares GROUP BY code_departement ORDER BY nb DESC",
    engine
)
print(f"\n  {nb} gares dans silver.gares")
print("  Repartition par departement :")
print(dept_check.to_string(index=False))

print("\nScript 01 termine.")
