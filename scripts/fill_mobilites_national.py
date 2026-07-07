"""Remplit silver.mobilites pour la France entière via Overpass OSM.

Découpe la France en 6 zones pour éviter les timeouts Overpass.
Insère directement dans la base cible (locale ou Supabase via DATABASE_URL).
"""
import os, sys, time, math, requests, psycopg2
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

url = os.getenv("DATABASE_URL")
if not url:
    pwd = os.getenv("DB_PASSWORD", "00000")
    url = f"postgresql://{os.getenv('DB_USER','postgres')}:{pwd}@{os.getenv('DB_HOST','127.0.0.1')}:{os.getenv('DB_PORT','5434')}/{os.getenv('DB_NAME','tourisme_train')}"

conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

OVERPASS = "https://overpass-api.de/api/interpreter"
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

ZONES = [
    ("Nord", "48.5,-5.2,51.1,8.3"),
    ("IDF-Est", "47.5,1.5,49.5,8.3"),
    ("Ouest", "46.0,-5.2,48.5,1.5"),
    ("Centre-Sud", "44.0,-1.0,47.5,5.0"),
    ("Sud-Est", "42.5,3.0,46.0,8.0"),
    ("Sud-Ouest", "42.5,-2.0,44.0,3.0"),
]

def overpass_query(bbox, desc, attempt=0):
    query = f"""[out:json][timeout:120];
(
  node["amenity"="bicycle_rental"]({bbox});
  node["highway"="bus_stop"]({bbox});
  node["railway"="tram_stop"]({bbox});
  node["amenity"="ferry_terminal"]({bbox});
);
out body;"""
    mirror = MIRRORS[attempt % len(MIRRORS)]
    try:
        r = requests.post(mirror, data={"data": query}, timeout=180,
                          headers={"User-Agent": "Wandrail/2.0"})
        r.raise_for_status()
        elts = r.json().get("elements", [])
        print(f"  {desc}: {len(elts)} éléments")
        return elts
    except Exception as e:
        if attempt < 2:
            print(f"  Retry {desc}: {e}")
            time.sleep(15)
            return overpass_query(bbox, desc, attempt + 1)
        print(f"  ÉCHEC {desc}: {e}")
        return []

cur.execute("TRUNCATE TABLE silver.mobilites RESTART IDENTITY")
print("silver.mobilites vidée")

total = 0
for zone_name, bbox in ZONES:
    print(f"\n--- Zone {zone_name} ({bbox}) ---")
    elements = overpass_query(bbox, zone_name)
    time.sleep(12)

    batch = []
    for el in elements:
        if el.get("type") != "node":
            continue
        tags = el.get("tags", {})
        lat, lon = el.get("lat"), el.get("lon")
        if not lat or not lon:
            continue

        amenity = tags.get("amenity", "")
        highway = tags.get("highway", "")
        railway = tags.get("railway", "")
        nom = tags.get("name", tags.get("ref", ""))

        if amenity == "bicycle_rental":
            t = "velo"
            try:
                nb = int(tags.get("capacity", 0) or 0)
            except (ValueError, TypeError):
                nb = 0
        elif highway == "bus_stop":
            t = "bus"
            nb = 0
        elif railway == "tram_stop":
            t = "tram"
            nb = 0
        elif amenity == "ferry_terminal":
            t = "ferry"
            nb = 0
        else:
            continue

        if not nom:
            nom = f"Arrêt {t}"

        batch.append((t, nom[:200], tags.get("addr:city", "")[:100], lat, lon, nb, "osm"))

    if batch:
        args = ",".join(
            cur.mogrify("(%s,%s,%s,%s,%s,%s,%s)", row).decode()
            for row in batch
        )
        cur.execute(f"""INSERT INTO silver.mobilites
            (type_mobilite, nom_station, commune, latitude, longitude, nb_places, source)
            VALUES {args}""")
        total += len(batch)
        print(f"  → {len(batch)} insérés (total: {total})")

print(f"\n=== TOTAL: {total} mobilités insérées ===")

cur.execute("SELECT type_mobilite, COUNT(*) FROM silver.mobilites GROUP BY type_mobilite ORDER BY 2 DESC")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()
