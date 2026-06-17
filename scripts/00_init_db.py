"""
Script 00 — Initialisation de la base de données
Crée l'architecture Médaillon complète : Bronze / Silver / Gold
À exécuter UNE SEULE FOIS au démarrage du projet.
"""

import sys, os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

def get_engine():
    return create_engine(
        f"postgresql://{os.getenv('DB_USER','postgres')}:{os.getenv('DB_PASSWORD','00000')}"
        f"@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','5434')}/{os.getenv('DB_NAME','tourisme_train')}"
    )

engine = get_engine()

print("=" * 60)
print("🏗️  INIT DB — Architecture Médaillon Bronze/Silver/Gold")
print("=" * 60)

SQL = """
-- ============================================================
-- SCHÉMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;

-- ============================================================
-- BRONZE — Données brutes (telles quelles, jamais modifiées)
-- ============================================================
DROP TABLE IF EXISTS bronze.gares_raw     CASCADE;
DROP TABLE IF EXISTS bronze.poi_raw       CASCADE;
DROP TABLE IF EXISTS bronze.lignes_raw    CASCADE;
DROP TABLE IF EXISTS bronze.mobilites_raw CASCADE;

CREATE TABLE bronze.gares_raw (
    id               SERIAL PRIMARY KEY,
    code_uic         TEXT,
    libelle          TEXT,
    commune          TEXT,
    departement      TEXT,
    voyageurs        TEXT,
    longitude_raw    TEXT,
    latitude_raw     TEXT,
    source_fichier   TEXT,
    date_extraction  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bronze.poi_raw (
    id              SERIAL PRIMARY KEY,
    json_brut       TEXT,         -- JSON complet de l'API
    identifiant     TEXT,
    nom             TEXT,
    type_raw        TEXT,
    commune         TEXT,
    latitude_raw    TEXT,
    longitude_raw   TEXT,
    region          TEXT,
    date_extraction TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bronze.lignes_raw (
    id              SERIAL PRIMARY KEY,
    code_ligne      TEXT,
    nom_ligne       TEXT,
    region          TEXT,
    departements    TEXT,
    longueur_km     TEXT,
    type_ligne      TEXT,
    date_extraction TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bronze.mobilites_raw (
    id              SERIAL PRIMARY KEY,
    type_source     TEXT,        -- 'nantes_api', 'gtfs', 'gbfs'
    json_brut       TEXT,
    nom_station     TEXT,
    type_mobilite   TEXT,
    commune         TEXT,
    latitude_raw    TEXT,
    longitude_raw   TEXT,
    date_extraction TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- SILVER — Données nettoyées et structurées
-- ============================================================
DROP TABLE IF EXISTS silver.population     CASCADE;
DROP TABLE IF EXISTS silver.cyclables      CASCADE;
DROP TABLE IF EXISTS silver.evenements     CASCADE;
DROP TABLE IF EXISTS silver.meteo          CASCADE;
DROP TABLE IF EXISTS silver.poi_enrichi    CASCADE;
DROP TABLE IF EXISTS silver.mobilites      CASCADE;
DROP TABLE IF EXISTS silver.lignes         CASCADE;
DROP TABLE IF EXISTS silver.poi            CASCADE;
DROP TABLE IF EXISTS silver.gares          CASCADE;

CREATE TABLE silver.gares (
    id                  SERIAL PRIMARY KEY,
    code_uic            VARCHAR(20)  UNIQUE,
    nom_gare            VARCHAR(200) NOT NULL,
    commune             VARCHAR(100),
    departement         VARCHAR(100),
    code_departement    VARCHAR(10),
    region              VARCHAR(100) DEFAULT 'Pays de la Loire',
    latitude            FLOAT,
    longitude           FLOAT,
    type_gare           VARCHAR(50)  DEFAULT 'Voyageurs',
    nb_voyageurs_annuel BIGINT       DEFAULT 0,
    date_extraction     TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE silver.poi (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(500)  NOT NULL,
    categorie       VARCHAR(100),
    sous_categorie  VARCHAR(100),
    commune         VARCHAR(100),
    departement     VARCHAR(100),
    code_postal     VARCHAR(10),
    latitude        FLOAT,
    longitude       FLOAT,
    telephone       VARCHAR(50),
    site_web        VARCHAR(500),
    note_moyenne    FLOAT,
    region          VARCHAR(100)  DEFAULT 'Pays de la Loire',
    source          VARCHAR(50)   DEFAULT 'datatourisme',
    date_maj        TIMESTAMP,
    date_extraction TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE silver.lignes (
    id          SERIAL PRIMARY KEY,
    code_ligne  VARCHAR(20),
    nom_ligne   VARCHAR(200),
    type_ligne  VARCHAR(50),
    region      VARCHAR(100),
    longueur_km FLOAT,
    date_extraction TIMESTAMP DEFAULT NOW()
);

CREATE TABLE silver.mobilites (
    id                SERIAL PRIMARY KEY,
    type_mobilite     VARCHAR(50),    -- 'velo', 'bus', 'tram', 'parking_velo'
    nom_station       VARCHAR(200),
    commune           VARCHAR(100),
    latitude          FLOAT,
    longitude         FLOAT,
    nb_places         INTEGER DEFAULT 0,
    id_gare_proche    INTEGER REFERENCES silver.gares(id),
    distance_gare_km  FLOAT,
    source            VARCHAR(50),
    date_extraction   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE silver.poi_enrichi (
    id                SERIAL PRIMARY KEY,
    id_poi            INTEGER REFERENCES silver.poi(id),
    id_gare_1         INTEGER REFERENCES silver.gares(id),
    id_gare_2         INTEGER REFERENCES silver.gares(id),
    id_gare_3         INTEGER REFERENCES silver.gares(id),
    nom_gare          VARCHAR(200),
    distance_gare_km  FLOAT,
    temps_marche_min  FLOAT,          -- distance / 5km/h * 60
    categorie         VARCHAR(100),
    region            VARCHAR(100)
);

CREATE TABLE silver.meteo (
    id              SERIAL PRIMARY KEY,
    commune         VARCHAR(100),
    latitude        FLOAT,
    longitude       FLOAT,
    date_meteo      DATE,
    temp_max        FLOAT,
    temp_min        FLOAT,
    precipitation   FLOAT,
    description     VARCHAR(100),
    saison          VARCHAR(20),
    date_extraction TIMESTAMP DEFAULT NOW()
);

CREATE TABLE silver.evenements (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(500),
    type_event      VARCHAR(100),
    commune         VARCHAR(100),
    latitude        FLOAT,
    longitude       FLOAT,
    date_debut      DATE,
    date_fin        DATE,
    gratuit         BOOLEAN DEFAULT FALSE,
    url             VARCHAR(500),
    date_extraction TIMESTAMP DEFAULT NOW()
);

CREATE TABLE silver.cyclables (
    id          SERIAL PRIMARY KEY,
    nom         VARCHAR(300),
    type_voie   VARCHAR(100),
    longueur_km FLOAT,
    commune     VARCHAR(100),
    date_extraction TIMESTAMP DEFAULT NOW()
);

CREATE TABLE silver.population (
    id              SERIAL PRIMARY KEY,
    commune         VARCHAR(100) UNIQUE,
    code_commune    VARCHAR(10),
    population_2024 INTEGER,
    superficie_km2  FLOAT,
    densite         FLOAT,
    revenu_moyen    FLOAT,
    date_extraction TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- GOLD — Schéma en étoile (Power BI + ML)
-- ============================================================
DROP TABLE IF EXISTS gold.fait_meteo_destination   CASCADE;
DROP TABLE IF EXISTS gold.fait_evenements           CASCADE;
DROP TABLE IF EXISTS gold.fait_co2                  CASCADE;
DROP TABLE IF EXISTS gold.fait_voyage               CASCADE;
DROP TABLE IF EXISTS gold.recommandations           CASCADE;
DROP TABLE IF EXISTS gold.poi_clusters              CASCADE;
DROP TABLE IF EXISTS gold.dim_region                CASCADE;
DROP TABLE IF EXISTS gold.dim_temps                 CASCADE;
DROP TABLE IF EXISTS gold.dim_transport             CASCADE;
DROP TABLE IF EXISTS gold.dim_profil                CASCADE;
DROP TABLE IF EXISTS gold.dim_poi                   CASCADE;
DROP TABLE IF EXISTS gold.dim_gare                  CASCADE;

-- DIMENSIONS
CREATE TABLE gold.dim_gare (
    id                  SERIAL PRIMARY KEY,
    code_uic            VARCHAR(20),
    nom_gare            VARCHAR(200),
    commune             VARCHAR(100),
    departement         VARCHAR(100),
    region              VARCHAR(100),
    latitude            FLOAT,
    longitude           FLOAT,
    nb_poi_2km          INTEGER DEFAULT 0,
    nb_poi_5km          INTEGER DEFAULT 0,
    nb_poi_10km         INTEGER DEFAULT 0,
    nb_categories       INTEGER DEFAULT 0,
    nb_mobilites        INTEGER DEFAULT 0,
    nb_voyageurs_annuel BIGINT  DEFAULT 0,
    score_attractivite  FLOAT   DEFAULT 0,
    profil_touristique  VARCHAR(50)
);

CREATE TABLE gold.dim_poi (
    id             SERIAL PRIMARY KEY,
    nom            VARCHAR(500),
    categorie      VARCHAR(100),
    sous_categorie VARCHAR(100),
    commune        VARCHAR(100),
    departement    VARCHAR(100),
    latitude       FLOAT,
    longitude      FLOAT,
    cluster_nom    VARCHAR(50),
    score_popularite FLOAT DEFAULT 0
);

CREATE TABLE gold.dim_profil (
    id                    SERIAL PRIMARY KEY,
    nom                   VARCHAR(50),
    description           TEXT,
    budget_jour_eur       INTEGER,
    distance_max_gare_km  INTEGER,
    duree_sejour_jours    INTEGER,
    preferences           TEXT,
    emoji                 VARCHAR(10)
);

CREATE TABLE gold.dim_transport (
    id              SERIAL PRIMARY KEY,
    nom             VARCHAR(50),
    emoji           VARCHAR(10),
    co2_g_km        FLOAT,
    vitesse_moy_kmh INTEGER,
    cout_moy_eur_km FLOAT,
    eco_score       INTEGER   -- 1 (polluant) à 5 (zéro émission)
);

CREATE TABLE gold.dim_temps (
    id          SERIAL PRIMARY KEY,
    date_jour   DATE UNIQUE,
    annee       INTEGER,
    mois        INTEGER,
    nom_mois    VARCHAR(20),
    trimestre   INTEGER,
    saison      VARCHAR(20),
    est_weekend BOOLEAN,
    est_vacances BOOLEAN DEFAULT FALSE
);

CREATE TABLE gold.dim_region (
    id              SERIAL PRIMARY KEY,
    nom_region      VARCHAR(100),
    code_region     VARCHAR(10),
    chef_lieu       VARCHAR(100),
    nb_departements INTEGER,
    population      BIGINT,
    superficie_km2  FLOAT
);

-- FAITS
CREATE TABLE gold.fait_voyage (
    id                  SERIAL PRIMARY KEY,
    id_gare             INTEGER REFERENCES gold.dim_gare(id),
    id_profil           INTEGER REFERENCES gold.dim_profil(id),
    id_region           INTEGER REFERENCES gold.dim_region(id),
    id_temps            INTEGER REFERENCES gold.dim_temps(id),
    distance_depart_km  FLOAT,
    nb_poi_2km          INTEGER DEFAULT 0,
    nb_poi_5km          INTEGER DEFAULT 0,
    nb_poi_10km         INTEGER DEFAULT 0,
    nb_categories       INTEGER DEFAULT 0,
    nb_hebergements     INTEGER DEFAULT 0,
    nb_restaurants      INTEGER DEFAULT 0,
    nb_activites        INTEGER DEFAULT 0,
    co2_train_kg        FLOAT,
    co2_voiture_kg      FLOAT,
    co2_economise_kg    FLOAT,
    score_attractivite  FLOAT,
    temps_trajet_min    INTEGER,
    cout_billet_estime  FLOAT
);

CREATE TABLE gold.fait_co2 (
    id                      SERIAL PRIMARY KEY,
    id_transport            INTEGER REFERENCES gold.dim_transport(id),
    id_region               INTEGER REFERENCES gold.dim_region(id),
    distance_km             INTEGER,
    co2_total_g             FLOAT,
    co2_par_km_g            FLOAT,
    economie_vs_voiture_g   FLOAT,
    economie_vs_avion_g     FLOAT,
    nb_arbres_equivalent    FLOAT
);

CREATE TABLE gold.poi_clusters (
    id              SERIAL PRIMARY KEY,
    id_poi          INTEGER REFERENCES gold.dim_poi(id),
    cluster_id      INTEGER,
    cluster_nom     VARCHAR(50),
    cluster_couleur VARCHAR(20),
    score_appartenance FLOAT
);

CREATE TABLE gold.recommandations (
    id              SERIAL PRIMARY KEY,
    id_profil       INTEGER REFERENCES gold.dim_profil(id),
    id_gare         INTEGER REFERENCES gold.dim_gare(id),
    rang            INTEGER,
    score_reco      FLOAT,
    raison          TEXT,
    nb_poi_match    INTEGER
);

-- INDEX pour les performances Power BI
CREATE INDEX idx_dim_gare_commune   ON gold.dim_gare(commune);
CREATE INDEX idx_dim_poi_categorie  ON gold.dim_poi(categorie);
CREATE INDEX idx_fait_voyage_gare   ON gold.fait_voyage(id_gare);
CREATE INDEX idx_fait_voyage_profil ON gold.fait_voyage(id_profil);
CREATE INDEX idx_fait_co2_transport ON gold.fait_co2(id_transport);
CREATE INDEX idx_poi_enrichi_gare   ON silver.poi_enrichi(id_gare_1);
CREATE INDEX idx_silver_poi_cat     ON silver.poi(categorie);
CREATE INDEX idx_silver_gares_dep   ON silver.gares(code_departement);
"""

print("\n🗑️  Suppression des anciennes tables...")
print("🏗️  Création des schémas Bronze / Silver / Gold...")

with engine.connect() as conn:
    conn.execute(text(SQL))
    conn.commit()

print("✅ Architecture complète créée !")
print("\n📋 Résumé des tables créées :")
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema IN ('bronze','silver','gold')
        ORDER BY table_schema, table_name
    """))
    schema_actuel = ""
    for row in result:
        if row[0] != schema_actuel:
            print(f"\n  [{row[0].upper()}]")
            schema_actuel = row[0]
        print(f"    ✓ {row[1]}")

print("\n🎉 Base de données prête !")
