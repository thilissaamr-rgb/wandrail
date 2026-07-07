<div align="center">

# Wandrail

**Le tourisme en train, autrement**

Plateforme Big Data et Intelligence Artificielle de recommandation de destinations touristiques accessibles en train, avec mesure de l'impact carbone evite.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E?logo=scikit-learn&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2.x-8884d8)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

[Demo live](https://wandrail-web.onrender.com) | Projet M1 BDIA | Sup de Vinci | RNCP40167

</div>

---

## Problematique

Le transport represente 31 % des emissions de gaz a effet de serre en France. Le train emet en moyenne **91 % de CO2 en moins** par rapport a la voiture (source ADEME). Pourtant, aucune plateforme ne permet de decouvrir des destinations touristiques **en partant de l'offre ferroviaire existante**.

Wandrail inverse le paradigme : l'utilisateur part d'une gare et decouvre ce qu'il y a autour — points d'interet, mobilite douce, horaires SNCF, impact carbone.

---

## Architecture technique

```
Sources de donnees
  SNCF Open Data | DATAtourisme | OpenStreetMap | Wikipedia | ADEME | Navitia
                                    |
                                    v
                        Pipeline ETL (Python)
  +----------+     +----------+     +----------+     +----------+
  |  BRONZE  | --> |  SILVER  | --> |   GOLD   | --> |    ML    |
  |  Brut    |     |  Nettoye |     |  Agrege  |     |  Modeles |
  +----------+     +----------+     +----------+     +----------+
                                    |
                                    v
                  Base de donnees (PostgreSQL 17 / Supabase)
    silver.gares | silver.poi | silver.poi_enrichi | silver.mobilites
    gold.dim_gare | gold.fait_voyage | gold.recommandations | gold.poi_clusters
                                    |
                                    v
                          API REST (FastAPI)
    /api/destinations | /api/stats | /api/analyste/* | /api/chat
    /api/recommandations | /api/ml-metrics | /api/data-quality
                                    |
                                    v
                       Frontend (React + Vite)
    Voyageur : Home, Destinations, Carte, Mon Voyage, Profil
    Analyste : Overview, Tourisme, Carbone, Profils, ML, Justification
    Chatbot  : assistant en langage naturel (rule-based)
```

| Couche | Technologie | Role |
|--------|-------------|------|
| **Bronze / Silver / Gold** | Python 3.12, SQLAlchemy 2.0, pandas | Extraction, nettoyage, agregats — PostgreSQL 17 (Supabase en production) |
| **Machine Learning** | scikit-learn (KMeans, KNN, StandardScaler, OneHotEncoder) | Clustering POI (k=15, silhouette 0.337) + recommandation par profil (stabilite@5 = 80%) |
| **API** | FastAPI 0.115, Uvicorn, psycopg v3, Pydantic | 21 endpoints REST, authentification JWT, cache in-memory 5 min — [`api/`](api/) |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3.4, Recharts, Leaflet | SPA responsive, dark mode, design system tokens — [`web/`](web/) |
| **Deploiement** | Render (Blueprint), GitHub auto-deploy | 2 services : API Python + site statique React |

---

## Donnees en production

| Metrique | Valeur |
|----------|--------|
| Gares SNCF referenceees | 2 782 |
| Points d'interet touristiques | 287 703 |
| Stations de mobilite douce | 495 409 |
| Departements couverts | 94 |
| Trajets analyses (fait_voyage) | 153 010 |
| Clusters POI (KMeans) | 15 |
| Profils voyageur | 5 (Famille, Solo, Couple, Entre amis, Senior) |
| Recommandations generees | 25 (5 destinations x 5 profils) |
| Score qualite donnees | 98.4 / 100 |

---

## Fonctionnalites

### Espace Voyageur

- **Page d'accueil** — Hero inspirationnel style Airbnb, formulaire de recherche, KPI animes, destinations recommandees
- **Destinations** — Grille filtrable par departement, categorie, profil voyageur, score minimum, avec tri et pagination
- **Detail destination** — Fiche complete : POI a proximite, carte Leaflet interactive, mobilite locale (bus, velo, tram), horaires SNCF temps reel via API Navitia
- **Carte interactive** — Vue cartographique de toutes les destinations avec markers et popups
- **Mon Voyage** — Planificateur multi-etapes avec calcul du CO2 economise par rapport a la voiture
- **Profil utilisateur** — Inscription/connexion JWT, avatar, favoris, badges illustres
- **Chatbot Wandrail** — Assistant flottant qui interroge la base en langage naturel (statistiques, destinations, CO2, info ville)
- **Dark mode** — Support complet via tokens semantiques Tailwind

### Espace Analyste (`/analyste`)

- **Vue generale** — KPI, score qualite, top destinations, repartition par departement et categorie (Recharts)
- **Tourisme** — Analyse categorielle et departementale, KPI touristiques
- **Carbone** — Comparaison CO2 train vs voiture (donnees ADEME : voiture 218 g/km, TER 30 g/km, TGV 4 g/km)
- **Profils voyageur** — Radar chart par profil, dominances categorielles, top 5 recommandations
- **Machine Learning** — Score silhouette (gauge SVG), distribution des clusters, stabilite KNN par profil
- **Justification** — Transparence scientifique : limites documentees, elbow chart, baseline vs ML

### Chatbot

Le chatbot est un systeme de question-reponse **rule-based** qui interroge directement PostgreSQL. Aucune API externe payante.

Intents supportes :
- Statistiques : *"Combien de gares ?"* → `COUNT(*) FROM silver.gares`
- Destinations : *"Ou aller en Bretagne ?"* → recherche par departement
- Thematiques : *"Destination nature"* → filtre par categorie POI
- Info ville : *"Nantes"* → fiche complete (score, POI, mobilite)
- CO2 : *"Impact carbone du train"* → calcul ADEME
- Voyage : *"Je veux aller a Lyon"* → detection de ville + fiche

---

## Machine Learning

### KMeans — Clustering des POI

Regroupe les 287 703 POI selon leur position geographique et leur categorie.

```
Features : latitude (StandardScaler), longitude (StandardScaler), categorie (OneHotEncoder)
Grille k : [2, 15]
Resultat : k* = 15, silhouette = 0.337
```

Limitation : le silhouette de 0.337 est modere. Les categories majoritaires (Hebergement 42%, Restauration 19%) dominent certains clusters.

### KNN — Recommandation par profil

Pour chaque profil voyageur, recommande les 5 destinations les plus proches.

```
Algorithme : NearestNeighbors(n_neighbors=10, metric='cosine')
Features par gare : volume POI par categorie (8), nb_poi_5km, score_attractivite, diversite
```

| Profil | Stabilite@5 |
|--------|-------------|
| Entre amis | 88% |
| Famille | 84% |
| Solo | 78% |
| Couple | 76% |
| Senior | 76% |
| **Moyenne** | **80%** |

La stabilite@5 mesure le pourcentage de recommandations identiques sur 10 executions independantes. Utilisee faute de verite terrain (pas de donnees utilisateurs reelles).

---

## Demarrage local

### Prerequis

- Python 3.12+
- Node.js 18+
- PostgreSQL 14+ (ou Docker)

### Base de donnees

```bash
# Option 1 : Docker
docker compose up -d

# Option 2 : charger le dump dans une base existante
psql -U postgres -d tourisme_train < data/dumps/wandrail_silver_gold.sql
```

### Backend (API)

```bash
cd api
pip install -r requirements.txt

# Configuration
cp .env.example .env
# Editer .env avec DATABASE_URL, AUTH_SECRET, NAVITIA_TOKEN

# Lancement
uvicorn main:app --reload --port 8000
```

L'API est accessible sur `http://localhost:8000`. Documentation OpenAPI : `http://localhost:8000/docs`.

### Frontend

```bash
cd web
npm install

# Configuration
cp .env.example .env
# VITE_API_BASE=http://localhost:8000

# Lancement
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

### Pipeline ETL (optionnel — rejouer les donnees)

```bash
cd scripts

# Pipeline complet sequentiel
python 00_init_db.py          # Creation schemas et tables
python 01_gares.py            # Import gares SNCF
python 02_datatourisme.py     # Import POI DATAtourisme
python 03_osm.py              # Import mobilites OpenStreetMap
python 04_enrichissement.py   # Jointure gare-POI (BallTree/Haversine, rayon 5 km)
python 05_gold_layer.py       # Agregats Gold (dim_gare, fait_voyage, scores)
python 06_ml_clustering.py    # KMeans clustering
python 07_ml_recommandation.py # KNN recommandation

# Ou en une commande :
python rejouer_national.py
```

---

## Endpoints API

| Methode | Route | Description |
|---------|-------|-------------|
| GET | `/api/health` | Sante API + base de donnees |
| GET | `/api/stats` | KPI page d'accueil (gares, POI, departements, mobilites) |
| GET | `/api/destinations` | Liste filtrable (q, dept, categorie, profil, score_min, tri) |
| GET | `/api/destinations/{nom}` | Detail destination + POI a proximite |
| GET | `/api/destinations/{nom}/mobilites` | Mobilite locale (Haversine) |
| GET | `/api/destinations/{nom}/schedules` | Horaires SNCF temps reel (Navitia, cache 5 min) |
| GET | `/api/recommandations/{profil}` | 5 destinations recommandees par profil |
| GET | `/api/data-quality` | Rapport qualite complet (4 dimensions, score /100) |
| GET | `/api/analyste/overview` | Vue d'ensemble analyste |
| GET | `/api/ml-metrics` | Metriques ML (silhouette, stabilite, clusters) |
| POST | `/api/chat` | Chatbot en langage naturel |
| POST | `/api/auth/register` | Inscription utilisateur |
| POST | `/api/auth/login` | Connexion (retourne JWT) |
| GET | `/api/profile` | Profil utilisateur (authentifie) |
| GET/POST/DELETE | `/api/favorites` | Gestion des favoris (authentifie) |

---

## Sources de donnees

| Source | Volume | Licence | Script |
|--------|--------|---------|--------|
| SNCF Open Data (gares) | 2 782 gares | Open Data SNCF | [`scripts/01_gares.py`](scripts/01_gares.py) |
| DATAtourisme (POI) | 287 703 POI | Licence Ouverte v2 | [`scripts/02_datatourisme.py`](scripts/02_datatourisme.py) |
| OpenStreetMap Overpass (mobilites) | 495 409 stations | ODbL | [`scripts/03_osm.py`](scripts/03_osm.py) |
| SNCF Navitia (horaires) | Temps reel | Open Data SNCF | [`scripts/13_navitia_gares.py`](scripts/13_navitia_gares.py) + [`api/navitia.py`](api/navitia.py) |
| Wikipedia (images) | Photos de gares | CC BY-SA | Integre dans le frontend |
| ADEME (CO2) | Referentiel emissions | Donnees publiques | Integre dans [`api/chat.py`](api/chat.py) |

Pipeline orchestrable par Airflow ([`airflow/dags/tourisme_dag.py`](airflow/dags/tourisme_dag.py)).

---

## Arborescence du projet

```
wandrail/
|-- api/                        # Backend FastAPI
|   |-- main.py                 # 21 endpoints REST
|   |-- db.py                   # Connexion PostgreSQL (auto-detect psycopg v2/v3)
|   |-- analyst.py              # Vues analytiques (overview, pipeline, ML)
|   |-- quality.py              # Rapport qualite donnees (98.4/100)
|   |-- chat.py                 # Chatbot rule-based (detection intent francais)
|   |-- security.py             # Authentification JWT (PBKDF2-HMAC-SHA256)
|   |-- navitia.py              # Horaires SNCF temps reel
|   +-- requirements.txt
|
|-- web/                        # Frontend React
|   |-- src/
|   |   |-- components/         # 18 composants (Navbar, Chatbot, Icon, Footer...)
|   |   |-- pages/              # 10 pages (Home, Destinations, Carte, MonVoyage...)
|   |   |   +-- analyste/       # 7 onglets (Overview, Tourisme, Carbone, ML...)
|   |   +-- lib/                # API client, auth, dataviz palette, theme
|   |-- tailwind.config.js      # Design tokens (bg-bg, text-ink, bg-eco...)
|   +-- vite.config.js          # Build + proxy dev
|
|-- scripts/                    # Pipeline ETL (17 scripts Python)
|   |-- 00_init_db.py           # DDL schemas + tables
|   |-- 01_gares.py             # Bronze : gares SNCF
|   |-- 02_datatourisme.py      # Bronze : POI
|   |-- 03_osm.py               # Bronze : mobilites OSM
|   |-- 04_enrichissement.py    # Silver : jointure gare-POI (BallTree)
|   |-- 05_gold_layer.py        # Gold : agregats, scores
|   |-- 06_ml_clustering.py     # ML : KMeans (k=15)
|   |-- 07_ml_recommandation.py # ML : KNN cosinus
|   +-- rejouer_national.py     # Orchestrateur pipeline complet
|
|-- models/                     # Modeles ML exportes
|   |-- kmeans_poi.pkl
|   +-- knn_recommandation.pkl
|
|-- docs/                       # Documentation
|   |-- dossier_technique_wandrail.md
|   |-- generate_docx.py        # Generateur du dossier Word avec graphiques
|   |-- deployment.md
|   +-- references/             # Cahier des charges, donnees de reference
|
|-- data/dumps/                 # Backup SQL (rollback)
|-- airflow/dags/               # DAG Airflow
|-- render.yaml                 # Blueprint deploiement Render
|-- docker-compose.yml          # PostgreSQL + Grafana local
+-- .env.example                # Variables d'environnement (template)
```

---

## Deploiement

Le projet est deploye sur **Render** via un Blueprint (`render.yaml`) :

```yaml
services:
  - type: web
    name: wandrail-api
    runtime: python
    rootDir: api
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT

  - type: web
    name: wandrail-web
    runtime: static
    rootDir: web
    buildCommand: npm install && npm run build
    staticPublishPath: dist
```

Variables d'environnement requises :

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | API | Chaine de connexion Supabase PostgreSQL |
| `CORS_ORIGINS` | API | URL du frontend autorisee |
| `AUTH_SECRET` | API | Cle secrete JWT |
| `NAVITIA_TOKEN` | API | Token API SNCF Navitia |
| `VITE_API_BASE` | Web | URL de l'API en production |

Guide complet : [`docs/deployment.md`](docs/deployment.md)

---

## Qualite des donnees

Score global : **98.4 / 100**, calcule automatiquement par `/api/data-quality`.

| Dimension | Score |
|-----------|-------|
| Completude | 99.9% |
| Validite | 95.5% |
| Unicite | 99.9% |
| Integrite referentielle | 100.0% |

---

## Statistiques du projet

| Metrique | Valeur |
|----------|--------|
| Commits | 110+ |
| Lignes de code | ~14 300 (5 570 Python + 8 750 JS/JSX) |
| Scripts ETL | 17 |
| Endpoints API | 21 |
| Composants React | 18 |
| Pages frontend | 10 + 7 onglets analyste |

---

## Licence

[MIT](LICENSE) -- 2026 Thilissa Amara
