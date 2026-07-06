<div align="center">

# 🚆 Wandrail

### Le tourisme en train, autrement — plateforme Big Data & IA

*Découvrez des destinations françaises accessibles en train, adaptées à vos envies,
votre budget et votre impact carbone.*

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E?logo=scikit-learn&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.9-8884d8)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

**[🌐 Démo live](https://wandrail-web.onrender.com)** · **[📖 Documentation](docs/)** · **[🎬 Vidéo MVP](#-livrables-diplôme)**

</div>

---

## 🎯 Le projet en une phrase

**Wandrail** est une application data-driven qui recommande des destinations
françaises accessibles en train, en croisant **2 782 gares SNCF**, **287 498 lieux
touristiques** et **14 clusters K-means** pour ne suggérer que ce qui fait sens
pour chaque voyageur.

Projet réalisé dans le cadre du **M1 Big Data & IA — Sup de Vinci** (RNCP40167),
en réponse au défi *Fondation SNCF · Open Data University*.

## 📸 Aperçu

<table>
<tr>
<td width="33%" valign="top">

**Espace Voyageur**
Hero cinématique 4 photos (Ken Burns), recherche 6 champs, compteurs animés, cartes destinations enrichies avec badges dynamiques.

</td>
<td width="33%" valign="top">

**Espace Analyste — Vue générale**
Grand tableau de bord type Power BI : 6 graphes Recharts (répartition catégories, top villes, radar qualité, projection CO₂ 2026-2030).

</td>
<td width="33%" valign="top">

**Justification ML**
Elbow K-means, jauge silhouette, feature importance, radar stabilité par profil, comparaison baseline vs ML.

</td>
</tr>
</table>

> 📷 Screenshots des 3 pages phares dans [`docs/screenshots/`](docs/screenshots/) (à ajouter avant soutenance).

## 🏗️ Architecture

```
SNCF Open Data + DATAtourisme + OpenStreetMap + INSEE
                          │
                          ▼
        ┌─────────┬─────────┬─────────┬────────┐
        │ Bronze  │ Silver  │  Gold   │   ML   │
        │ (brut)  │ (clean) │(métier) │ K-means│
        └────┬────┴────┬────┴────┬────┴───┬────┘
             └─────────┴─────────┴────────┘
                          │
                     PostgreSQL 16
                          │
                       FastAPI
                          │
                    React + Vite + Tailwind
```

| Couche | Rôle | Tables principales |
|---|---|---|
| **Bronze** | Extractions brutes traçables | `gares_raw`, `poi_raw`, `mobilites_raw` |
| **Silver** | Nettoyage, typage, géolocalisation BallTree/Haversine | `gares`, `poi`, `poi_enrichi` |
| **Gold** | Agrégats métier, scores, dimensions étoile | `dim_gare`, `dim_poi`, `recommandations` |
| **ML** | KMeans (k=14, silhouette 0,324) + KNN (cosine) | `poi_clusters`, modèles `.pkl` |
| **API** | Contrats JSON, filtres, JWT | FastAPI + SQLAlchemy |
| **Web** | Espace Voyageur + Espace Analyste | React 18 + Vite + Tailwind |

## 🧭 Table des matières

- [Fonctionnalités](#-fonctionnalités-clés)
- [Stack technique](#-stack-technique)
- [Démarrage rapide](#-démarrage-rapide-30-secondes)
- [Installation complète](#-installation-complète)
- [Endpoints API](#-endpoints-api)
- [Livrables diplôme](#-livrables-diplôme)
- [Roadmap](#-roadmap)
- [Positionnement honnête](#-positionnement-honnête)

## ✨ Fonctionnalités clés

### Espace Voyageur
- 🎬 **Hero cinématique** — carrousel 4 photos avec effet Ken Burns
- 🔍 **Recherche 6 champs** — départ / voyageurs / budget / temps / envies
- 🌦️ **Météo temps réel** — Aujourd'hui / Demain / Après-demain (Open-Meteo)
- 🌱 **Impact CO₂ vivant** — compteur animé, 91 % de moins qu'en voiture (ADEME)
- 🗺️ **Cartes destinations enrichies** — badges dynamiques (Bas carbone, Populaire, Idéal famille)
- ⭐ **Favoris + Mon voyage** — préparation d'itinéraires personnalisés
- 🌓 **Dark mode** complet

### Espace Analyste (`/analyste`)
- 📊 **Vue générale** — 6 graphes Recharts (pie catégories, bar top villes, radar qualité, area projection CO₂)
- 🌍 **Territoires** — ScatterChart potentiel × opportunité, top départements
- 🌱 **Carbone** — comparaison ADEME train vs voiture, équivalent arbres
- 👥 **Profils voyageur** — 5 profils avec top 5 recommandations
- 🤖 **Machine Learning** — jauge silhouette, distribution clusters, stabilité KNN
- 🎓 **Justification** — page dédiée : elbow, feature importance, radar stabilité, baseline vs ML

## 🛠️ Stack technique

**Data & ML**
- PostgreSQL 16 (schemas Bronze/Silver/Gold/userapp)
- Python 3.10+, scikit-learn 1.5 (K-means, KNN NearestNeighbors)
- Airflow (DAG pipeline)
- Sources : SNCF Open Data, DATAtourisme, OpenStreetMap, INSEE, Open-Meteo

**API**
- FastAPI 0.110, SQLAlchemy, Pydantic
- JWT auth (`userapp.users`)
- Endpoints REST documentés `/docs`

**Frontend**
- React 18 + Vite 5
- Tailwind CSS 3.4 (tokens sémantiques light/dark)
- Recharts 3.9 (data-viz)
- Leaflet (carte interactive)
- React Router 6

**Infra**
- Docker Compose (PostgreSQL local)
- Render (déploiement API + web statique)

## ⚡ Démarrage rapide (30 secondes)

Si tu as déjà PostgreSQL + Node + Python installés :

```bash
git clone https://github.com/thilissaamr-rgb/wandrail.git
cd wandrail
cp .env.example .env               # renseigner DATABASE_URL

# Backend
cd api && pip install -r requirements.txt && uvicorn main:app --reload &

# Frontend
cd ../web && npm install && npm run dev
```

→ Ouvre <http://localhost:5173>

## 🐳 Installation complète

### Prérequis
- Python 3.10+ · Node.js 18+ · PostgreSQL 16 (ou Docker Desktop)

### Base + pipeline data

```bash
docker compose up -d
python scripts/00_init_db.py --force
python scripts/01_gares.py
python scripts/02_datatourisme.py
python scripts/04_enrichissement.py
python scripts/05_gold_layer.py
python scripts/06_ml_clustering.py
python scripts/07_ml_recommandation.py
python scripts/11_data_quality_migration.py
```

Puis initialiser les tables applicatives (utilisateurs, favoris) :
```bash
psql wandrail < scripts/setup_app_tables.sql
```

Ou restaurer directement le dump complet : `psql wandrail < data/dumps/wandrail_silver_gold.sql`

### API

```bash
cd api
python -m venv .venv
.venv\Scripts\activate     # Windows (Linux/Mac : source .venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd web
npm install
npm run dev
```

### Tests

```bash
python -m compileall -q api scripts airflow/dags
cd web && npm run build
```

## 🔌 Endpoints API

| Route | Description |
|---|---|
| `GET /api/stats` | Nb gares, lieux, CO₂ vs voiture |
| `GET /api/destinations` | Recherche filtrée (département, catégorie, profil, tri) |
| `GET /api/destinations/{nom}` | Fiche complète d'une gare |
| `GET /api/recommandations/{profil}` | Top 5 KNN par profil |
| `GET /api/analyste/overview` | KPI dashboard + top catégories/villes/dép. |
| `GET /api/analyste/decision` | Potentiel territorial + scénario carbone |
| `GET /api/ml-metrics` | Silhouette, distribution clusters, stabilité@5 |
| `GET /api/data-quality` | Score qualité + anomalies + complétude |
| `POST /api/auth/register` · `login` | JWT |

Documentation OpenAPI complète sur `/docs` (Swagger UI).

## 🎓 Livrables diplôme

Ce projet valide les critères du **RNCP40167 — Expert en ingénierie de données massives et IA (Niveau 7)** :

| Livrable | Emplacement |
|---|---|
| Code complet sur Git | ce dépôt |
| Pipeline data documenté | [`docs/audits/audit_donnees.md`](docs/audits/audit_donnees.md) · [`api/analyst.py`](api/analyst.py) `build_pipeline` |
| Modèles IA entraînés (.pkl) | [`models/kmeans_poi.pkl`](models/) · [`models/knn_recommandation.pkl`](models/) |
| Métriques évaluation | [`docs/metriques_kmeans.json`](docs/metriques_kmeans.json) · [`docs/metriques_knn.json`](docs/metriques_knn.json) |
| Scénario démo 5 min | [`docs/demo_jury.md`](docs/demo_jury.md) |
| Audit national | [`docs/audits/audit_national_2026-07-05.md`](docs/audits/audit_national_2026-07-05.md) |
| Cahier des charges | [`docs/references/cahier_des_charges.pdf`](docs/references/cahier_des_charges.pdf) |

**Vidéo MVP** : *à ajouter — placeholder pour lien YouTube/Drive*

## 🗺️ Roadmap

- [x] Refonte UI/UX pro (Home, Data Analyse, Mon voyage)
- [x] Recharts + palette dataviz cohérente
- [x] Page Justification ML (crown jewel)
- [ ] Météo Open-Meteo branchée sur fiche destination
- [ ] Préférences utilisateur (Nature/Culture/Bas carbone/PMR…)
- [ ] Refonte carte (Positron, clusters MarkerCluster)
- [ ] Collecte vérité terrain (200 avis) → precision/recall réels

## 🤝 Positionnement honnête

Wandrail est un **prototype national professionnel** qui démontre une chaîne
complète : données → qualité → features → modèles → API → interface.

Il ne prétend **pas** :
- fournir des horaires ou tarifs temps réel (SNCF API commerciale hors périmètre) ;
- disposer d'un système de recommandation validé sur des comportements utilisateurs réels
  (precision/recall restent `null` faute de vérité terrain — voir page Justification).

Les métriques annoncées sont **recalculées à chaque exécution** sur la base courante
et affichées dans l'Espace Analyste.

## 📜 License

[MIT](LICENSE) © 2026 Thilissa Amara

---

<div align="center">

*Made with ❤️ pour la soutenance M1 BDIA — Sup de Vinci, juillet 2026*

</div>
