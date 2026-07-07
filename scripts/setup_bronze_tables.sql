-- Structure Bronze (couche brute, tracabilite pipeline).
-- Doit exister meme quand le deploiement n'inclut pas les donnees brutes
-- (ex : Supabase charge depuis un dump Silver+Gold uniquement) : le code
-- api/quality.py fait COUNT(*) sur ces tables pour le rapport pipeline.
--
-- Executer une seule fois apres le dump principal :
--   psql "$DATABASE_URL" -f scripts/setup_bronze_tables.sql
--
-- Idempotent (CREATE IF NOT EXISTS).

CREATE SCHEMA IF NOT EXISTS bronze;

CREATE TABLE IF NOT EXISTS bronze.gares_raw (
    code_uic       TEXT,
    nom_gare       TEXT,
    raw_json       JSONB,
    ingested_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze.poi_raw (
    id_source       TEXT,
    nom             TEXT,
    latitude_raw    TEXT,
    longitude_raw   TEXT,
    json_brut       JSONB,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze.lignes_raw (
    id_source       TEXT,
    nom_ligne       TEXT,
    raw_json        JSONB,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bronze.mobilites_raw (
    id_source       TEXT,
    type_mobilite   TEXT,
    raw_json        JSONB,
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- bronze.navitia_gares_raw est cree par scripts/13_navitia_gares.py
-- (mapping code_uic -> stop_area Navitia + payload complet).
