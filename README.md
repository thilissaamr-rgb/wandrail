# Wandrail - tourisme en train et intelligence territoriale

Wandrail est une plateforme Big Data & IA conçue dans le cadre du Master 1 Big Data & IA de Sup de Vinci, autour du défi Fondation SNCF : **comment faciliter et encourager le tourisme en train en France ?**

Le pipeline cible désormais la **France métropolitaine couverte par le référentiel SNCF voyageurs utilisé** et propose deux parcours dans une seule application :

- **Espace Voyageur** : découverte, carte, recommandations, EcoScore, comparaison CO₂ et favoris ;
- **Espace Analyste** : qualité des données, pipeline Médaillon, modèles IA et aide à la décision SNCF/territoires, accessible directement pour la soutenance sans alourdir le menu voyageur.

## Indicateurs

Les nombres de gares, POI, régions, anomalies et recommandations sont calculés depuis la base courante et affichés dans l’Espace Analyste. Ils ne sont pas figés dans la documentation. Precision@5 et Recall@5 restent non disponibles faute de vérité terrain utilisateur.

Dernière exécution nationale validée le 5 juillet 2026 : 2 782 gares voyageurs, 287 498 POI Silver, 34 386 communes INSEE, 14 clusters KMeans (silhouette 0,324) et 25 recommandations KNN expliquées.

## Architecture

```text
SNCF + DATAtourisme + OSM + INSEE
                 |
                 v
Bronze -> Silver -> Gold -> ML -> FastAPI -> React
 brut     nettoyé   métier   IA      JSON      UX
```

| Couche | Rôle | Tables principales |
|---|---|---|
| Bronze | Conservation des extractions brutes | `gares_raw`, `poi_raw`, `mobilites_raw` |
| Silver | Nettoyage, typage et enrichissement géographique | `gares`, `poi`, `poi_enrichi`, `mobilites` |
| Gold | Agrégats, scoring, dimensions et recommandations | `dim_gare`, `dim_poi`, `poi_clusters`, `recommandations` |
| API | Contrats JSON, filtres, sécurité | FastAPI + SQLAlchemy |
| Web | Parcours Voyageur et Analyste | React + Vite + Tailwind |

## Routes frontend

### Voyageur

- `/` - proposition de valeur et sélection ;
- `/destinations` - recherche, filtres et recommandations ;
- `/destinations/:nom` - fiche destination, POI, carte et CO₂ ;
- `/carte` - explorateur national avec agrégation par zoom, recherche et filtres ;
- `/favoris` - espace « Mon voyage », itinéraires locaux et favoris synchronisés.
- `/profil` - compte connecté, activité réelle, voyages préparés et préférences.

### Analyste

- `/analyste` - vue d'ensemble ;
- `/analyste/data-quality` - rapport qualité ;
- `/analyste/pipeline` - Bronze → Silver → Gold → ML → API → Frontend ;
- `/analyste/ml` - KMeans, KNN et métriques ;
- `/analyste/decision` - potentiel territorial et scénario carbone ;
- `/data-dashboard` - redirection de compatibilité vers le rapport qualité ;
- `/methodologie` - méthodologie complète.

## Endpoints principaux

- `GET /api/stats`
- `GET /api/data-quality`
- `GET /api/anomalies`
- `GET /api/pipeline`
- `GET /api/ml-metrics`
- `GET /api/analyste/overview`
- `GET /api/analyste/decision`
- `GET /api/top-destinations`
- `GET /api/destinations` (recherche, département, profil, catégorie, tri)
- `GET /api/recommandations/{profil}`
- `GET /api/profile` et `PATCH /api/profile` (authentifiés)

La documentation OpenAPI est disponible sur `/docs` lorsque l'API fonctionne.

## Installation locale

### Prérequis

- Python 3.10+
- Node.js 18+
- PostgreSQL 16 ou Docker Desktop

### Configuration

```bash
cp .env.example .env
```

Renseigner au minimum les accès PostgreSQL. Les secrets et clés API ne doivent jamais être commités.

### Base et pipeline

```bash
docker compose up -d
python scripts/00_init_db.py --force   # bootstrap destructif, une seule fois
python scripts/01_gares.py
python scripts/02_datatourisme.py
python scripts/03_osm.py              # ignoré en mode national (Overpass public)
python scripts/04_enrichissement.py
python scripts/05_gold_layer.py
python scripts/06_ml_clustering.py
python scripts/07_ml_recommandation.py
python scripts/11_data_quality_migration.py
```

### API

```bash
cd api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd web
npm install
npm run dev
```

Application : `http://localhost:5173`

API : `http://localhost:8000`

## Tests de livraison

```bash
python -m compileall -q api scripts airflow/dags
cd web
npm run build
```

La recette doit couvrir les routes Voyageur, les cinq routes Analyste, la compatibilité `/data-dashboard`, les erreurs API et le responsive mobile.

## Déploiement Render

Le fichier `render.yaml` décrit le frontend statique et l'API. Configurer dans Render :

- `DATABASE_URL`
- `AUTH_SECRET`
- `CORS_ORIGINS`
- `VITE_API_BASE`

Une recette sur la base de production reste indispensable après déploiement.

## Documentation soutenance

- [Audit complet](docs/audit_complet_2026-07-02.md)
- [Audit des données](docs/audit_donnees.md)
- [Scénario de démonstration 5 minutes](docs/demo_jury.md)
- [Métriques KMeans](docs/metriques_kmeans.json)
- [Métriques KNN](docs/metriques_knn.json)

## Positionnement honnête

Wandrail est un prototype national professionnel. Il démontre une chaîne complète données → qualité → features → modèles → API → interface. Il ne prétend pas fournir des horaires ou tarifs temps réel ni un système de recommandation déjà validé sur des comportements utilisateurs.
