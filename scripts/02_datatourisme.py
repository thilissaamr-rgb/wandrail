"""
Script 02 — Points d'intérêt DATAtourisme (Pays de la Loire)
1. Appelle l'API DATAtourisme PDL
2. Extrait TOUTES les infos : nom, catégorie, commune, GPS, téléphone, site web...
3. Insère dans bronze.poi_raw puis silver.poi
Résultat attendu : ~10 000-15 000 POI
"""

import sys, os, json, requests
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

engine  = get_engine()
API_KEY = os.getenv("DATATOURISME_API_KEY", "0f58925d-4b95-4ca2-b41b-9d7ea9527421")
URL_DT  = f"https://diffuseur.datatourisme.fr/webservice/b4c0271347c8681f390b852d8937d2e5/{API_KEY}"

# Mapping catégories DATAtourisme → catégories normalisées
CATEGORIES = {
    "Accommodation"   : "Hébergement",
    "Hotel"           : "Hébergement",
    "Camping"         : "Hébergement",
    "Gite"            : "Hébergement",
    "Restaurant"      : "Restauration",
    "FoodEstablishment": "Restauration",
    "Cafe"            : "Restauration",
    "Museum"          : "Culture",
    "CulturalSite"    : "Culture",
    "Church"          : "Patrimoine",
    "Castle"          : "Patrimoine",
    "ReligiousSite"   : "Patrimoine",
    "NaturalHeritage" : "Nature",
    "Park"            : "Nature",
    "Beach"           : "Nature",
    "Lake"            : "Nature",
    "SportsAndLeisurePlace": "Sport & Loisirs",
    "Sport"           : "Sport & Loisirs",
    "EntertainmentAndEvent": "Événement",
    "Cinema"          : "Loisirs",
    "Theater"         : "Culture",
    "TouristInformationCenter": "Service",
    "Store"           : "Commerce",
    "PointOfInterest" : "Autre",
}

print("=" * 60)
print("🏛️  SCRIPT 02 — DATAtourisme Pays de la Loire")
print("=" * 60)

# ── ÉTAPE 1 : Appel API ─────────────────────────────────────────
print("\n📡 Connexion à l'API DATAtourisme...")
try:
    r = requests.get(URL_DT, timeout=120)
    r.raise_for_status()
    data  = r.json()
    graph = data.get("@graph", data) if isinstance(data, dict) else data
    print(f"✅ {len(graph)} items reçus de l'API")
except Exception as e:
    print(f"❌ Erreur API : {e}")
    exit(1)

# ── ÉTAPE 2 : Bronze ────────────────────────────────────────────
print("\n📦 Bronze — insertion données brutes...")
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE bronze.poi_raw RESTART IDENTITY"))
    count_b = 0
    for item in graph:
        try:
            ident = item.get("@id", "")
            nom_b = ""
            if "rdfs:label" in item:
                lab = item["rdfs:label"]
                if isinstance(lab, dict):
                    nom_b = lab.get("@value", "") or lab.get("fr", "")
                elif isinstance(lab, list):
                    for l in lab:
                        if isinstance(l, dict) and l.get("@language") == "fr":
                            nom_b = l.get("@value", "")
                            break

            types = item.get("@type", [])
            if isinstance(types, str): types = [types]
            type_raw = "|".join(types[:5])

            conn.execute(text("""
                INSERT INTO bronze.poi_raw (json_brut, identifiant, nom, type_raw, region)
                VALUES (:json, :id, :nom, :type, :reg)
            """), {
                "json": json.dumps(item, ensure_ascii=False)[:5000],
                "id"  : ident,
                "nom" : str(nom_b)[:200],
                "type": type_raw[:200],
                "reg" : "Pays de la Loire",
            })
            count_b += 1
        except Exception:
            continue
    conn.commit()
print(f"   ✅ {count_b} lignes dans bronze.poi_raw")

# ── ÉTAPE 3 : Extraction Silver ─────────────────────────────────
print("\n🔪 Extraction et normalisation des champs...")

def extraire_nom(item):
    """Extrait le nom en français de l'item DATAtourisme."""
    if "rdfs:label" in item:
        lab = item["rdfs:label"]
        if isinstance(lab, dict):
            v = lab.get("@value", "") or lab.get("fr", "")
            return str(v).strip() if not isinstance(v, list) else (str(v[0]).strip() if v else "")
        elif isinstance(lab, list):
            for l in lab:
                if isinstance(l, dict) and l.get("@language") == "fr":
                    return str(l.get("@value", "")).strip()
    return ""

def extraire_coordonnees(item):
    """Extrait latitude et longitude de l'item."""
    lat, lon = None, None
    loc = item.get("isLocatedAt") or item.get("schema:geo")
    if not loc: return lat, lon
    if isinstance(loc, list): loc = loc[0]
    geo = loc.get("schema:geo") if isinstance(loc, dict) else loc
    if not geo: return lat, lon
    if isinstance(geo, list): geo = geo[0]
    try:
        lat_r = geo.get("schema:latitude", {})
        lon_r = geo.get("schema:longitude", {})
        lat = float(lat_r.get("@value", 0) if isinstance(lat_r, dict) else lat_r or 0)
        lon = float(lon_r.get("@value", 0) if isinstance(lon_r, dict) else lon_r or 0)
    except (ValueError, TypeError):
        pass
    return lat, lon

def extraire_commune(item):
    """Extrait la commune de l'adresse."""
    loc = item.get("isLocatedAt", {})
    if isinstance(loc, list): loc = loc[0]
    addr = loc.get("schema:address", {}) if isinstance(loc, dict) else {}
    if isinstance(addr, list): addr = addr[0]
    if isinstance(addr, dict):
        return str(addr.get("schema:addressLocality", "") or "").strip().lower()
    return ""

def extraire_categorie(item):
    """Détermine la catégorie normalisée."""
    types = item.get("@type", [])
    if isinstance(types, str): types = [types]
    for t in types:
        t_clean = t.split(":")[-1].split("#")[-1]
        if t_clean in CATEGORIES:
            return CATEGORIES[t_clean], t_clean
    # Chercher par mots-clés
    for t in types:
        t_lower = t.lower()
        for key, val in CATEGORIES.items():
            if key.lower() in t_lower:
                return val, key
    return "Autre", "PointOfInterest"

def extraire_telephone(item):
    """Extrait le numéro de téléphone."""
    contact = item.get("hasContact", [])
    if isinstance(contact, list) and contact: contact = contact[0]
    if isinstance(contact, dict):
        tel = contact.get("schema:telephone", "") or contact.get("foaf:phone", "")
        return str(tel).strip()[:50] if tel else None
    return None

def extraire_site_web(item):
    """Extrait l'URL du site web."""
    contact = item.get("hasContact", [])
    if isinstance(contact, list) and contact: contact = contact[0]
    if isinstance(contact, dict):
        url = contact.get("foaf:homepage", "") or contact.get("schema:url", "")
        return str(url).strip()[:500] if url else None
    return None

def extraire_date_maj(item):
    """Extrait la date de dernière mise à jour."""
    date = item.get("lastUpdate") or item.get("dc:date")
    if date:
        try:
            return pd.to_datetime(str(date))
        except Exception:
            pass
    return None

# Construction du DataFrame Silver
pois_silver = []
erreurs = 0

for item in graph:
    try:
        nom = extraire_nom(item)
        if not nom or len(nom) < 2:
            continue

        lat, lon = extraire_coordonnees(item)
        if not lat or not lon or lat == 0 or lon == 0:
            continue

        # Filtre géographique Pays de la Loire
        if not (46.3 <= lat <= 48.4 and -2.6 <= lon <= 1.0):
            continue

        categorie, sous_cat = extraire_categorie(item)
        commune   = extraire_commune(item)
        telephone = extraire_telephone(item)
        site_web  = extraire_site_web(item)
        date_maj  = extraire_date_maj(item)

        pois_silver.append({
            "nom"          : nom[:500],
            "categorie"    : categorie,
            "sous_categorie": sous_cat[:100] if sous_cat else None,
            "commune"      : commune[:100],
            "departement"  : None,  # sera enrichi depuis silver.gares
            "latitude"     : lat,
            "longitude"    : lon,
            "telephone"    : telephone,
            "site_web"     : site_web,
            "region"       : "Pays de la Loire",
            "source"       : "datatourisme",
            "date_maj"     : date_maj,
        })
    except Exception:
        erreurs += 1
        continue

print(f"✅ {len(pois_silver)} POI extraits ({erreurs} erreurs ignorées)")

df_silver = pd.DataFrame(pois_silver)
avant = len(df_silver)
df_silver = df_silver.drop_duplicates(subset=['nom', 'commune'])
print(f"🧹 Doublons supprimés : {avant} → {len(df_silver)}")

print(f"\n📂 Répartition par catégorie :")
print(df_silver['categorie'].value_counts().to_string())

# ── ÉTAPE 4 : Insertion Silver ──────────────────────────────────
print("\n📤 Insertion dans silver.poi...")
with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE silver.poi RESTART IDENTITY CASCADE"))
    for _, row in df_silver.iterrows():
        conn.execute(text("""
            INSERT INTO silver.poi
              (nom, categorie, sous_categorie, commune, departement,
               latitude, longitude, telephone, site_web, region, source, date_maj)
            VALUES (:nom, :cat, :scat, :com, :dep, :lat, :lon,
                    :tel, :web, :reg, :src, :dmaj)
        """), {
            "nom" : row['nom'],
            "cat" : row['categorie'],
            "scat": row['sous_categorie'],
            "com" : row['commune'],
            "dep" : row['departement'],
            "lat" : row['latitude'],
            "lon" : row['longitude'],
            "tel" : row['telephone'],
            "web" : row['site_web'],
            "reg" : row['region'],
            "src" : row['source'],
            "dmaj": row['date_maj'],
        })
    conn.commit()

nb = pd.read_sql("SELECT COUNT(*) as n FROM silver.poi", engine).iloc[0]['n']
print(f"✅ {nb} POI dans silver.poi")
print("\n🎉 Script 02 terminé !")
