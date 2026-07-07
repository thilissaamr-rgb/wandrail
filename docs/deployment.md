# Déploiement Wandrail

## Architecture prod

- **Frontend** : Render Static Site (`wandrail-web.onrender.com`) → build Vite depuis `web/`
- **API** : Render Web Service Python (`wandrail-api.onrender.com`) → uvicorn depuis `api/`
- **DB** : Supabase PostgreSQL 16 (région Frankfurt eu-central-1) → chargée depuis `data/dumps/`

Le blueprint `render.yaml` déclare les 2 services + les env vars nécessaires.

## Variables d'environnement Render

| Service | Variable | Comment obtenir |
|---|---|---|
| `wandrail-api` | `DATABASE_URL` | Supabase → Settings → Database → Connection string (URI) |
| `wandrail-api` | `NAVITIA_TOKEN` | https://numerique.sncf.com → Créer une clé API |
| `wandrail-api` | `AUTH_SECRET` | Auto-généré par Render |
| `wandrail-api` | `CORS_ORIGINS` | `https://wandrail-web.onrender.com` |
| `wandrail-web` | `VITE_API_BASE` | `https://wandrail-api.onrender.com` |

## Recharger la data nationale sur Supabase

Le dump actuel `data/dumps/wandrail_silver_gold.sql` couvre uniquement les **Pays de la Loire** (136 gares, 26 099 POI).
Pour passer à la couverture nationale (2 782 gares, 287 498 POI) :

### Option 1 — Rejouer le pipeline en local puis re-dumper

```bash
# 1. Configurer le scope national dans .env
DATA_SCOPE=france_metropolitaine   # au lieu de pays-de-la-loire

# 2. Rejouer le pipeline (peut prendre 2-4h selon la connexion)
docker compose up -d postgres
python scripts/00_init_db.py --force    # WARNING : destructif
python scripts/01_gares.py
python scripts/02_datatourisme.py       # ~60 min pour la France entiere
python scripts/03_osm.py
python scripts/04_enrichissement.py
python scripts/05_gold_layer.py
python scripts/06_ml_clustering.py
python scripts/07_ml_recommandation.py
python scripts/11_data_quality_migration.py

# 3. Dumper la DB locale
pg_dump --host 127.0.0.1 --port 5434 --username postgres \
        --schema silver --schema gold --schema userapp \
        --format plain --file data/dumps/wandrail_national.sql \
        tourisme_train

# 4. Recharger sur Supabase
psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS silver CASCADE; \
                         DROP SCHEMA IF EXISTS gold CASCADE;"
psql "$DATABASE_URL" -f data/dumps/wandrail_national.sql
psql "$DATABASE_URL" -f scripts/setup_bronze_tables.sql
psql "$DATABASE_URL" -f scripts/setup_app_tables.sql
python scripts/13_navitia_gares.py   # avec DATABASE_URL en env
```

### Option 2 — Charger un dump national déjà produit

Si un fichier `wandrail_national.sql` existe déjà :

```bash
psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS silver CASCADE; DROP SCHEMA IF EXISTS gold CASCADE;"
psql "$DATABASE_URL" -f wandrail_national.sql
psql "$DATABASE_URL" -f scripts/setup_bronze_tables.sql
psql "$DATABASE_URL" -f scripts/setup_app_tables.sql
```

## Setup initial complet (fresh Supabase)

```bash
# 1. Dump principal (Silver + Gold + userapp)
psql "$DATABASE_URL" -f data/dumps/wandrail_silver_gold.sql

# 2. Tables applicatives (users, favoris, reviews)
psql "$DATABASE_URL" -f scripts/setup_app_tables.sql

# 3. Structure Bronze (tracabilite, meme si donnees brutes non chargees)
psql "$DATABASE_URL" -f scripts/setup_bronze_tables.sql

# 4. Ingestion Navitia (referentiel gares -> stop_area)
python scripts/13_navitia_gares.py
```

Sans `setup_bronze_tables.sql`, l'endpoint `/api/analyste/overview` renvoie 503
(le rapport qualité pipeline fait `COUNT(*)` sur les tables Bronze).

## Redéploiement Render

Render redéploie automatiquement à chaque push sur `main`.
En cas de rebuild manuel : Dashboard → service → **Manual Deploy** → **Deploy latest commit**.

## Réveil de l'API (spin-down free tier)

Le plan Free Render met l'API en veille après 15 min d'inactivité.
Premier appel après → **30-40 s** de cold start.

**Astuce démo jury** : ouvrir l'app 2 min avant la présentation pour la réveiller.
