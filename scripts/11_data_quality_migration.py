"""Migration idempotente : clarifie la semantique des notes POI et ajoute des garde-fous."""

import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text


sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

engine = create_engine(
    f"postgresql+psycopg://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', '00000')}"
    f"@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5434')}"
    f"/{os.getenv('DB_NAME', 'tourisme_train')}"
)

MIGRATION = """
ALTER TABLE silver.poi ADD COLUMN IF NOT EXISTS score_qualite_source FLOAT;
ALTER TABLE silver.poi ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE silver.poi ADD COLUMN IF NOT EXISTS image_credit TEXT;
ALTER TABLE userapp.users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

UPDATE silver.poi
SET score_qualite_source = note_moyenne,
    note_moyenne = NULL
WHERE source = 'datatourisme'
  AND score_qualite_source IS NULL;

UPDATE silver.poi
SET note_moyenne = NULL
WHERE source = 'osm';

ALTER TABLE silver.poi DROP CONSTRAINT IF EXISTS ck_silver_poi_rating;
ALTER TABLE silver.poi ADD CONSTRAINT ck_silver_poi_rating
    CHECK (note_moyenne IS NULL OR note_moyenne BETWEEN 0 AND 5);

ALTER TABLE silver.poi DROP CONSTRAINT IF EXISTS ck_silver_poi_coordinates;
ALTER TABLE silver.poi ADD CONSTRAINT ck_silver_poi_coordinates
    CHECK (
        (latitude IS NULL OR latitude BETWEEN -90 AND 90)
        AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)
    );

CREATE INDEX IF NOT EXISTS idx_silver_gares_name
    ON silver.gares(nom_gare);
CREATE INDEX IF NOT EXISTS idx_poi_enrichi_name_distance
    ON silver.poi_enrichi(nom_gare, distance_gare_km);
CREATE INDEX IF NOT EXISTS idx_recommandations_profile_rank
    ON gold.recommandations(id_profil, rang);

ALTER TABLE silver.population DROP CONSTRAINT IF EXISTS population_commune_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_population_code_commune_unique
    ON silver.population(code_commune)
    WHERE code_commune IS NOT NULL AND code_commune <> '';
CREATE INDEX IF NOT EXISTS idx_population_commune
    ON silver.population(commune);
"""

with engine.begin() as connection:
    connection.execute(text(MIGRATION))

print("Migration qualite appliquee : notes clarifiees et contraintes ajoutees.")
