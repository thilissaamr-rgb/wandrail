"""Extrait les photos officielles DATAtourisme de Bronze vers Silver.

Migration idempotente destinée aux bases déjà chargées. Les prochaines
ingestions remplissent directement ces champs via 02_datatourisme.py.
"""

import os
import sys

from sqlalchemy import text

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from api.db import engine


SQL = """
ALTER TABLE silver.poi ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE silver.poi ADD COLUMN IF NOT EXISTS image_credit TEXT;

CREATE TEMP TABLE tmp_poi_media ON COMMIT DROP AS
SELECT DISTINCT ON (
    LOWER(nom),
    ROUND(latitude_raw::numeric, 5),
    ROUND(longitude_raw::numeric, 5)
)
    LOWER(nom) AS nom_key,
    ROUND(latitude_raw::numeric, 5) AS latitude_key,
    ROUND(longitude_raw::numeric, 5) AS longitude_key,
    json_brut::jsonb #>> '{hasMainRepresentation,0,ebucore:hasRelatedResource,0,ebucore:locator,0}' AS image_url,
    json_brut::jsonb #>> '{hasMainRepresentation,0,ebucore:hasAnnotation,0,credits,0}' AS image_credit
FROM bronze.poi_raw
WHERE latitude_raw <> ''
  AND longitude_raw <> ''
  AND json_brut LIKE '%hasMainRepresentation%'
  AND json_brut::jsonb #>> '{hasMainRepresentation,0,ebucore:hasRelatedResource,0,ebucore:locator,0}' LIKE 'http%';

CREATE INDEX tmp_poi_media_match
    ON tmp_poi_media(nom_key, latitude_key, longitude_key);

UPDATE silver.poi AS poi
SET image_url = media.image_url,
    image_credit = NULLIF(media.image_credit, '')
FROM tmp_poi_media AS media
WHERE LOWER(LEFT(poi.nom, 200)) = media.nom_key
  AND ROUND(poi.latitude::numeric, 5) = media.latitude_key
  AND ROUND(poi.longitude::numeric, 5) = media.longitude_key
  AND poi.image_url IS NULL;
"""

with engine.begin() as connection:
    connection.execute(text(SQL))
    count = connection.execute(
        text("SELECT COUNT(*) FROM silver.poi WHERE image_url IS NOT NULL")
    ).scalar_one()

print(f"Migration médias terminée : {count:,} POI avec une photo officielle.")
