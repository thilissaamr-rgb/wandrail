"""Ingestion du flux national DATAtourisme (Bronze -> Silver).

Le flux est telecharge sur disque puis analyse en streaming : le volume France
entiere ne doit jamais etre charge integralement en memoire.
"""

import json
import os
import re
import sys
import tempfile
import zipfile
from collections import Counter
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import ijson
import requests
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

WEBSERVICE_ID = os.getenv(
    "DATATOURISME_WEBSERVICE_ID", "222c9873dec5a3a41478b01f9a70a589"
).strip()
API_KEY = os.getenv("DATATOURISME_API_KEY", "").strip()
if not API_KEY:
    raise RuntimeError("DATATOURISME_API_KEY doit etre defini dans .env")
if not re.fullmatch(r"[A-Za-z0-9_-]{16,80}", WEBSERVICE_ID):
    raise RuntimeError("DATATOURISME_WEBSERVICE_ID est invalide")

URL_DT = (
    f"https://diffuseur.datatourisme.fr/webservice/{WEBSERVICE_ID}/"
    f"{quote(API_KEY, safe='')}"
)
LAT_MIN, LAT_MAX = 41.0, 51.6
LON_MIN, LON_MAX = -5.6, 10.0
BATCH_SIZE = int(os.getenv("DATATOURISME_BATCH_SIZE", "2000"))

CATEGORIES = {
    "Accommodation": "Hebergement", "Hotel": "Hebergement",
    "Camping": "Hebergement", "Gite": "Hebergement",
    "BedAndBreakfast": "Hebergement", "Hostel": "Hebergement",
    "Restaurant": "Restauration", "FoodEstablishment": "Restauration",
    "Cafe": "Restauration", "FastFoodRestaurant": "Restauration",
    "Winery": "Restauration", "Museum": "Culture", "CulturalSite": "Culture",
    "Theater": "Culture", "Library": "Culture", "ArtGallery": "Culture",
    "Church": "Patrimoine", "Castle": "Patrimoine", "ReligiousSite": "Patrimoine",
    "Monument": "Patrimoine", "HistoricBuilding": "Patrimoine",
    "NaturalHeritage": "Nature", "Park": "Nature", "Beach": "Nature",
    "Lake": "Nature", "Forest": "Nature", "Garden": "Nature",
    "SportsAndLeisurePlace": "Sport & Loisirs", "Sport": "Sport & Loisirs",
    "LeisureSportComplexe": "Sport & Loisirs", "EntertainmentAndEvent": "Evenement",
    "Festival": "Evenement", "ExhibitionEvent": "Evenement", "Cinema": "Loisirs",
    "TouristInformationCenter": "Service", "Store": "Commerce",
    "PointOfInterest": "Autre",
}


def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '00000')}"
        f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5434')}"
        f"/{os.getenv('DB_NAME', 'tourisme_train')}"
    )


def scalar(value):
    if isinstance(value, list):
        value = value[0] if value else None
    if isinstance(value, dict):
        value = value.get("@value") or value.get("fr") or value.get("@id")
    return str(value).strip() if value not in (None, "") else ""


def first_dict(value):
    if isinstance(value, list):
        value = value[0] if value else {}
    return value if isinstance(value, dict) else {}


def label(item):
    value = item.get("rdfs:label")
    if isinstance(value, list):
        french = next(
            (entry for entry in value if isinstance(entry, dict) and entry.get("@language") == "fr"),
            value[0] if value else {},
        )
        return scalar(french)
    return scalar(value)


def location(item):
    located = first_dict(item.get("isLocatedAt") or item.get("schema:geo"))
    geo = first_dict(located.get("schema:geo") or located)
    address = first_dict(located.get("schema:address"))
    try:
        latitude = float(scalar(geo.get("schema:latitude")))
        longitude = float(scalar(geo.get("schema:longitude")))
    except (TypeError, ValueError):
        latitude, longitude = None, None
    return latitude, longitude, address


def category(item):
    types = item.get("@type", [])
    types = [types] if isinstance(types, str) else types
    cleaned = [str(value).split(":")[-1].split("#")[-1] for value in types]
    for value in cleaned:
        if value in CATEGORIES:
            return CATEGORIES[value], value
    for value in cleaned:
        for source, normalized in CATEGORIES.items():
            if source.lower() in value.lower():
                return normalized, source
    return "Autre", "PointOfInterest"


def contact_fields(item):
    contact = first_dict(item.get("hasContact"))
    telephone = scalar(contact.get("schema:telephone") or contact.get("foaf:phone"))
    website = scalar(contact.get("foaf:homepage") or contact.get("schema:url"))
    return telephone[:50] or None, website[:500] or None


def media_fields(item):
    """Extrait la photo principale officielle et son crédit DATAtourisme."""
    representation = first_dict(item.get("hasMainRepresentation") or item.get("hasRepresentation"))
    resource = first_dict(representation.get("ebucore:hasRelatedResource"))
    image_url = scalar(resource.get("ebucore:locator"))
    annotation = first_dict(representation.get("ebucore:hasAnnotation"))
    credit = scalar(annotation.get("credits"))
    if not image_url.lower().startswith(("https://", "http://")):
        image_url = ""
    return image_url[:2000] or None, credit[:500] or None


def updated_at(item):
    raw = scalar(item.get("lastUpdate") or item.get("dc:date"))
    if not raw:
        return None
    try:
        value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
    except ValueError:
        return None


def department_code(postal_code, latitude):
    digits = re.sub(r"\D", "", postal_code or "")
    if len(digits) < 5:
        return None
    if digits.startswith("20"):
        return "2A" if latitude is not None and latitude < 42.25 else "2B"
    return digits[:2]


def administrative_reference():
    try:
        deps = requests.get(
            "https://geo.api.gouv.fr/departements?fields=nom,code,codeRegion", timeout=30
        )
        deps.raise_for_status()
        regions = requests.get("https://geo.api.gouv.fr/regions?fields=nom,code", timeout=30)
        regions.raise_for_status()
        names = {str(row["code"]): row["nom"] for row in regions.json()}
        return {
            str(row["code"]): (row["nom"], names.get(str(row.get("codeRegion")), "France"))
            for row in deps.json()
        }
    except Exception as exc:
        print(f"Referentiel administratif indisponible ({exc}); codes postaux conserves.")
        return {}


def iter_items(path):
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            members = [
                info for info in archive.infolist()
                if not info.is_dir()
                and info.filename.lower().endswith((".json", ".jsonld"))
                and "/objects/" in f"/{info.filename.lower()}"
            ]
            if not members:
                raise RuntimeError("L'archive DATAtourisme ne contient aucun fichier JSON")
            total_size = sum(info.file_size for info in members)
            print(f"Archive DATAtourisme: {len(members):,} POI, {total_size / 1024**3:.2f} Gio JSON")
            for info in members:
                with archive.open(info) as source:
                    item = json.load(source)
                    if isinstance(item, dict):
                        yield item
        return
    with open(path, "rb") as source:
        first = source.read(1)
        while first in b" \r\n\t":
            first = source.read(1)
        source.seek(0)
        prefix = "item" if first == b"[" else "@graph.item"
        yield from ijson.items(source, prefix)


def flush(connection, bronze_rows, silver_rows):
    if bronze_rows:
        connection.execute(
            text(
                """INSERT INTO bronze.poi_raw
                (json_brut, identifiant, nom, type_raw, commune, latitude_raw,
                 longitude_raw, region)
                VALUES (:json, :id, :nom, :type, :commune, :lat, :lon, :region)"""
            ),
            bronze_rows,
        )
        bronze_rows.clear()
    if silver_rows:
        connection.execute(
            text(
                """INSERT INTO silver.poi
                (nom, categorie, sous_categorie, commune, departement, code_postal,
                 latitude, longitude, telephone, site_web, image_url, image_credit, note_moyenne,
                 score_qualite_source, region, source, date_maj)
                VALUES (:nom, :categorie, :sous_categorie, :commune, :departement,
                        :code_postal, :latitude, :longitude, :telephone, :site_web,
                        :image_url, :image_credit,
                        NULL, :score, :region, 'datatourisme', :date_maj)"""
            ),
            silver_rows,
        )
        silver_rows.clear()


print("=" * 60)
print("SCRIPT 02 - DATAtourisme France metropolitaine")
print("=" * 60)

temp_path = None
try:
    with requests.get(
        URL_DT,
        headers={"User-Agent": "Wandrail-M1/2.0 (ingestion open data)"},
        timeout=(30, 600),
        stream=True,
    ) as response:
        response.raise_for_status()
        content_type = response.headers.get("content-type", "")
        if not any(kind in content_type.lower() for kind in ("json", "zip", "octet-stream")):
            raise RuntimeError(f"Type de reponse DATAtourisme inattendu: {content_type}")
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as output:
            temp_path = output.name
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    output.write(chunk)

    reference = administrative_reference()
    engine = get_engine()
    bronze_rows, silver_rows = [], []
    seen_ids, seen_fallback = set(), set()
    category_counts = Counter()
    bronze_count = silver_count = rejected_geo = duplicates = 0
    recent_limit = datetime.now() - timedelta(days=180)

    with engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE bronze.poi_raw RESTART IDENTITY"))
        connection.execute(text("TRUNCATE TABLE silver.poi RESTART IDENTITY CASCADE"))

        for item in iter_items(temp_path):
            if not isinstance(item, dict):
                continue
            poi_name = label(item)
            latitude, longitude, address = location(item)
            identifier = scalar(item.get("@id"))
            types = item.get("@type", [])
            types = [types] if isinstance(types, str) else types
            city = scalar(address.get("schema:addressLocality")).lower()
            postal_code = scalar(address.get("schema:postalCode"))[:10]

            bronze_rows.append(
                {
                    "json": json.dumps(item, ensure_ascii=False, default=str),
                    "id": identifier,
                    "nom": poi_name[:200],
                    "type": "|".join(map(str, types[:5]))[:200],
                    "commune": city[:100],
                    "lat": str(latitude or ""),
                    "lon": str(longitude or ""),
                    "region": "France",
                }
            )
            bronze_count += 1

            if not poi_name or latitude is None or longitude is None:
                if len(bronze_rows) >= BATCH_SIZE:
                    flush(connection, bronze_rows, silver_rows)
                continue
            if not (LAT_MIN <= latitude <= LAT_MAX and LON_MIN <= longitude <= LON_MAX):
                rejected_geo += 1
                if len(bronze_rows) >= BATCH_SIZE:
                    flush(connection, bronze_rows, silver_rows)
                continue

            fallback_key = (poi_name.casefold(), round(latitude, 5), round(longitude, 5))
            if (identifier and identifier in seen_ids) or fallback_key in seen_fallback:
                duplicates += 1
                if len(bronze_rows) >= BATCH_SIZE:
                    flush(connection, bronze_rows, silver_rows)
                continue
            if identifier:
                seen_ids.add(identifier)
            seen_fallback.add(fallback_key)

            normalized_category, subcategory = category(item)
            telephone, website = contact_fields(item)
            image_url, image_credit = media_fields(item)
            date_maj = updated_at(item)
            raw_score = (3 if website else 0) + (2 if telephone else 0) + (
                3 if date_maj and date_maj > recent_limit else 0
            )
            code_department = department_code(postal_code, latitude)
            department, region = reference.get(code_department, (code_department, "France"))
            silver_rows.append(
                {
                    "nom": poi_name[:500],
                    "categorie": normalized_category,
                    "sous_categorie": subcategory[:100],
                    "commune": city[:100],
                    "departement": department,
                    "code_postal": postal_code,
                    "latitude": latitude,
                    "longitude": longitude,
                    "telephone": telephone,
                    "site_web": website,
                    "image_url": image_url,
                    "image_credit": image_credit,
                    "score": round(raw_score / 8 * 10, 2),
                    "region": region,
                    "date_maj": date_maj,
                }
            )
            silver_count += 1
            category_counts[normalized_category] += 1

            if len(bronze_rows) >= BATCH_SIZE or len(silver_rows) >= BATCH_SIZE:
                flush(connection, bronze_rows, silver_rows)
            if bronze_count % 25000 == 0:
                print(f"  {bronze_count:,} POI lus; {silver_count:,} POI Silver")

        flush(connection, bronze_rows, silver_rows)

    if bronze_count == 0:
        raise RuntimeError("Le flux DATAtourisme ne contient aucun POI")
    print(f"Bronze: {bronze_count:,} POI complets")
    print(f"Silver: {silver_count:,} POI geocodes et dedupliques")
    print(f"Hors perimetre ferroviaire: {rejected_geo:,}; doublons: {duplicates:,}")
    print("Categories:", dict(category_counts.most_common()))
finally:
    if temp_path and os.path.exists(temp_path):
        os.remove(temp_path)

print("Script 02 termine.")
