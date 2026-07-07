# WANDRAIL — Dossier Technique de Projet

**Projet d'Études — Mastère Big Data & IA**
**SUP DE VINCI — Promotion 2025-2026**

---

**Titre du projet :** Wandrail — Le tourisme en train, autrement
**Étudiante :** Thilissa Amara
**Formation :** M1 Big Data & Intelligence Artificielle (RNCP40167)
**Date de livraison :** 7 juillet 2026
**Repository :** https://github.com/thilissaamr-rgb/wandrail
**Application :** https://wandrail-web.onrender.com

---

## TABLE DES MATIÈRES

1. [Présentation du projet et de l'équipe](#1-présentation-du-projet-et-de-léquipe)
2. [Analyse de la problématique](#2-analyse-de-la-problématique)
3. [Organisation et méthodologies](#3-organisation-et-méthodologies)
4. [Architecture technique](#4-architecture-technique)
5. [Pipeline de données — Architecture Médaillon](#5-pipeline-de-données--architecture-médaillon)
6. [Modèles de Machine Learning](#6-modèles-de-machine-learning)
7. [API Backend (FastAPI)](#7-api-backend-fastapi)
8. [Frontend (React)](#8-frontend-react)
9. [Déploiement et infrastructure](#9-déploiement-et-infrastructure)
10. [Qualité des données et KPI](#10-qualité-des-données-et-kpi)
11. [Chatbot intelligent](#11-chatbot-intelligent)
12. [Sécurité](#12-sécurité)
13. [Tests et validation](#13-tests-et-validation)
14. [Limites et perspectives](#14-limites-et-perspectives)
15. [Annexes](#15-annexes)

---

## 1. PRÉSENTATION DU PROJET ET DE L'ÉQUIPE

### 1.1 Contexte

Le secteur du tourisme en France représente 7,4 % du PIB national. Parallèlement, le transport représente 31 % des émissions de gaz à effet de serre, dont une large part imputable à la voiture individuelle. Le train émet en moyenne **91 % de CO₂ en moins** par rapport à la voiture (source ADEME : voiture 218 g/km, TER 30 g/km, TGV 4 g/km).

Pourtant, aucune plateforme ne permet aujourd'hui de **découvrir des destinations touristiques en partant de l'offre ferroviaire existante** : les voyageurs choisissent d'abord une destination, puis cherchent comment s'y rendre, ce qui favorise la voiture.

### 1.2 Proposition de valeur

**Wandrail** inverse le paradigme : l'utilisateur part d'une gare et découvre ce qu'il y a autour. La plateforme :

- Recense **2 782 gares** du réseau ferroviaire français
- Enrichit chaque gare avec **287 703 points d'intérêt** touristiques dans un rayon de 5 km
- Propose **495 409 stations de mobilité douce** (vélos, bus, trams, ferries) autour des gares
- Calcule un **score d'attractivité** par gare combinant densité de POI, diversité catégorielle et fréquentation
- Recommande des destinations via un **moteur de recommandation ML** (KMeans + KNN) adapté à 5 profils voyageur
- Offre un **chatbot intelligent** qui interroge la base en langage naturel

### 1.3 Équipe projet

| Membre | Rôle | Responsabilités |
|--------|------|-----------------|
| Thilissa Amara | Data Engineer & Full-Stack Developer | Architecture médaillon, pipeline ETL, modèles ML, API FastAPI, frontend React, déploiement |

### 1.4 Stack technologique

| Couche | Technologies |
|--------|-------------|
| **Données** | PostgreSQL 17, Supabase (cloud), architecture Bronze/Silver/Gold |
| **ETL** | Python 3.12, SQLAlchemy 2.0, pandas, scikit-learn, requests |
| **Machine Learning** | scikit-learn (KMeans, KNN, StandardScaler, OneHotEncoder) |
| **API** | FastAPI 0.115, Uvicorn, psycopg v3, Pydantic |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3.4, Recharts, Leaflet, React Router 7 |
| **Déploiement** | Render (API + static site), GitHub (CI/CD auto-deploy) |
| **Qualité** | Score de qualité 98.4/100 calculé automatiquement |

---

## 2. ANALYSE DE LA PROBLÉMATIQUE

### 2.1 Problématique

> **Comment exploiter les données ouvertes du tourisme et du transport ferroviaire français pour proposer une plateforme de recommandation de destinations touristiques accessibles en train, tout en mesurant l'impact carbone évité ?**

### 2.2 Enjeux métiers identifiés

| Enjeu | Description | Réponse Wandrail |
|-------|-------------|------------------|
| **Tourisme durable** | Les offices de tourisme cherchent à promouvoir des destinations accessibles sans voiture | Score d'attractivité par gare + recommandations personnalisées |
| **Décarbonation** | SNCF et collectivités veulent quantifier l'impact carbone du train vs voiture | Calcul CO₂ ADEME intégré, scénarios par trajet |
| **Mobilité douce** | Le dernier kilomètre est un frein : bus, vélos, trams autour des gares | 495 409 stations de mobilité locale référencées |
| **Données exploitables** | Les données existent mais sont dispersées (DATAtourisme, SNCF, OSM) | Pipeline médaillon unifiant 4+ sources |

### 2.3 Sources de données

| Source | Type | Volume | Licence |
|--------|------|--------|---------|
| **DATAtourisme** (data.gouv.fr) | API REST + flux | 287 703 POI | Licence Ouverte v2 |
| **SNCF Open Data** | CSV + API Navitia | 2 782 gares, horaires temps réel | Open Data SNCF |
| **OpenStreetMap** (Overpass API) | API Overpass QL | 495 409 stations mobilité | ODbL |
| **Wikipedia** | API REST | Images de gares | CC BY-SA |
| **ADEME** | Référentiel | Facteurs d'émission CO₂/km | Données publiques |

### 2.4 Contraintes techniques

- **Stockage limité** : Supabase free tier = 500 Mo → exclusion du schéma Bronze (2,2 Go), conservation Silver + Gold uniquement (303 Mo)
- **Temps de réponse** : Cache in-memory 5 min sur les endpoints lourds (quality, overview)
- **Absence de vérité terrain** : Pas de données utilisateurs réelles pour évaluer la précision des recommandations → métrique de stabilité@5 utilisée
- **API rate limits** : DATAtourisme et Overpass limitent les requêtes → pipeline par zones géographiques

---

## 3. ORGANISATION ET MÉTHODOLOGIES

### 3.1 Méthodologie

Le projet suit une approche **itérative incrémentale** inspirée de Scrum :

1. **Sprint 1** (Jan-Fév) : Cadrage, maquettes, POC Streamlit, premiers scripts ETL
2. **Sprint 2** (Mar-Avr) : Architecture médaillon, scripts Bronze→Silver→Gold, modèles ML
3. **Sprint 3** (Mai) : Migration vers React + FastAPI, UI/UX professionnelle
4. **Sprint 4** (Juin) : Données nationales, mobilité OSM, chatbot, déploiement Render
5. **Sprint 5** (Juil) : Audit qualité, corrections, documentation technique

### 3.2 Outils de gestion

| Outil | Usage |
|-------|-------|
| **Git / GitHub** | Versioning, branches, historique |
| **Render** | Déploiement continu (auto-deploy sur push) |
| **VS Code** | IDE principal |
| **Terminal / CLI** | Scripts Python, gestion Git, debugging |

### 3.3 Versioning

Le projet utilise **Git** avec des commits conventionnels :
- `feat:` pour les nouvelles fonctionnalités
- `fix:` pour les corrections
- `chore:` pour la maintenance
- `perf:` pour les optimisations

Le repository contient **108 commits** traçant l'évolution complète du projet, soit environ **14 300 lignes de code** (5 570 Python + 8 750 JavaScript/JSX).

---

## 4. ARCHITECTURE TECHNIQUE

### 4.1 Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────┐
│                        SOURCES DE DONNÉES                        │
│  DATAtourisme │ SNCF Open Data │ OSM Overpass │ Wikipedia │ ADEME│
└──────┬────────┴───────┬────────┴──────┬───────┴─────┬────┴──────┘
       │                │               │             │
       ▼                ▼               ▼             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PIPELINE ETL (Python)                          │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐      │
│  │ BRONZE  │──▶│  SILVER  │──▶│   GOLD   │──▶│    ML    │      │
│  │ Brut    │   │ Nettoyé  │   │ Agrégé   │   │ Modèles  │      │
│  └─────────┘   └──────────┘   └──────────┘   └──────────┘      │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              BASE DE DONNÉES (PostgreSQL / Supabase)             │
│  silver.gares │ silver.poi │ silver.poi_enrichi │ silver.mobilites│
│  gold.dim_gare │ gold.fait_voyage │ gold.recommandations         │
│  gold.poi_clusters │ gold.dim_profil                             │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API REST (FastAPI)                            │
│  /api/destinations │ /api/stats │ /api/analyste/* │ /api/chat    │
│  /api/recommandations │ /api/ml-metrics │ /api/data-quality      │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                        │
│  Parcours Voyageur : Home, Destinations, Carte, Mon Voyage       │
│  Parcours Analyste : Overview, Tourisme, Carbone, Profils, ML    │
│  Chatbot Wandrail (assistant en langage naturel)                 │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Schéma de base de données

**Schéma Silver (données nettoyées) :**

| Table | Description | Lignes |
|-------|-------------|--------|
| `silver.gares` | Gares SNCF géolocalisées | 2 782 |
| `silver.poi` | Points d'intérêt touristiques | 287 703 |
| `silver.poi_enrichi` | Jointure gare-POI (distance, temps de marche) | ~1 400 000 |
| `silver.mobilites` | Stations de mobilité douce (vélo, bus, tram, ferry) | 495 409 |

**Schéma Gold (agrégats analytiques) :**

| Table | Description | Lignes |
|-------|-------------|--------|
| `gold.dim_gare` | Dimension gare : score, nb_poi, profil, voyageurs | 2 782 |
| `gold.dim_profil` | 5 profils voyageur éditoriaux | 5 |
| `gold.fait_voyage` | Table de faits : distances, CO₂ économisé | 153 010 |
| `gold.recommandations` | 5 destinations × 5 profils = 25 recommandations | 25 |
| `gold.poi_clusters` | POI classés par cluster KMeans | ~287 000 |

---

## 5. PIPELINE DE DONNÉES — ARCHITECTURE MÉDAILLON

### 5.1 Principe

L'architecture **Médaillon** (Lakehouse) structure les données en 3 couches de qualité croissante :

- **Bronze** : Données brutes telles qu'extraites des API (conservation fidèle, traçabilité)
- **Silver** : Données nettoyées, typées, géolocalisées, dédoublonnées
- **Gold** : Agrégats métier, dimensions, scores, features ML

### 5.2 Scripts du pipeline

Le pipeline est orchestré par 13 scripts Python exécutés séquentiellement :

| Script | Couche | Rôle | Contrôles |
|--------|--------|------|-----------|
| `00_init_db.py` | — | Création des schémas et tables | DDL idempotent |
| `01_gares.py` | Bronze | Import gares SNCF Open Data | Volume, doublons |
| `02_datatourisme.py` | Bronze | Import POI DATAtourisme | Rate limit, pagination |
| `03_osm.py` | Bronze | Import mobilités OpenStreetMap Overpass | Zones géographiques |
| `04_enrichissement.py` | Silver | BallTree / Haversine : distance gare-POI, temps de marche | Rayon 5 km |
| `05_gold_layer.py` | Gold | Agrégats dim_gare, fait_voyage, score attractivité | Clés vers Silver |
| `06_ml_clustering.py` | ML | Clustering POI (StandardScaler + OneHot + KMeans) | Silhouette score |
| `07_ml_recommandation.py` | ML | KNN recommandation par profil (distance cosinus) | Stabilité@5 |
| `08_navitia.py` | Bronze | Import horaires SNCF Navitia | Token API |
| `09_evenements.py` | Bronze | Import événements | Optionnel |
| `10_insee.py` | Silver | Enrichissement données INSEE | Optionnel |
| `11_data_quality_migration.py` | — | Migration des contrôles qualité | Score > 95 |
| `12_media_migration.py` | Silver | Migration médias complémentaires | Optionnel |
| `13_navitia_gares.py` | Bronze | Enrichissement gares Navitia | Optionnel |

**Scripts utilitaires :**
| `fill_mobilites_national.py` | Silver | Remplissage mobilités France entière via OSM | 6 zones |
| `rejouer_national.py` | — | Orchestrateur pipeline national complet | Séquentiel |
| `_load_dump_to_supabase.py` | — | Chargement dump SQL vers Supabase | 303 Mo |

### 5.3 Contrôles qualité par couche

**Bronze → Silver :**
- Filtrage des gares sans code UIC
- Suppression des coordonnées hors France métropolitaine (lat ∈ [41, 52], lon ∈ [-5, 10])
- Normalisation des catégories POI en 8 classes : Hebergement, Restauration, Culture, Nature, Patrimoine, Loisirs, Evenement, Service
- Dédoublonnage par nom + coordonnées

**Silver → Gold :**
- Calcul du score d'attractivité : `score = log(nb_poi + 1) × diversité_catégories × bonus_fréquentation`
- Jointure gare-POI par BallTree (Haversine) dans un rayon de 5 km
- Estimation du temps de marche : `distance_km / 4.5 × 60` (vitesse piéton 4,5 km/h)

---

## 6. MODÈLES DE MACHINE LEARNING

### 6.1 Modèle 1 : KMeans — Clustering des POI

**Objectif :** Regrouper les 287 703 POI selon leur position géographique et leur catégorie pour identifier des zones touristiques cohérentes.

**Features :**
- `latitude` (StandardScaler)
- `longitude` (StandardScaler)
- `categorie` (OneHotEncoder → 8 colonnes binaires)

**Préprocessing :**
1. StandardScaler sur les coordonnées (moyenne 0, écart-type 1)
2. OneHotEncoder sur la catégorie (sparse matrix)
3. Échantillonnage stratifié de 5 000 POI pour la recherche de k optimal

**Hyperparamètre :** k recherché dans la grille [2, 15]

**Résultats :**

| Métrique | Valeur | Interprétation |
|----------|--------|----------------|
| **k optimal** | 15 | Optimum en borne haute de la grille |
| **Score silhouette** | 0.337 | Regroupement modéré — les catégories majoritaires (Hebergement 42%) dominent certains clusters |
| **Statut** | `optimum_en_borne_haute` | Grille à étendre si plus de données |

**Limitation honnête :** Le silhouette de 0.337 est modéré. Les catégories majoritaires (Hébergement 122k, Restauration 55k) dominent les clusters. L'interprétation métier reste prudente — les clusters identifient des zones géographiques plutôt que des profils thématiques fins.

**Export :** `models/kmeans_poi.pkl` (scikit-learn pickle)

### 6.2 Modèle 2 : KNN — Recommandation par profil

**Objectif :** Pour chaque profil voyageur (Famille, Solo, Couple, Entre amis, Senior), recommander les 5 destinations les plus proches de ses préférences.

**Features par gare (10 dimensions) :**
1. Volume de POI par catégorie (8 colonnes)
2. Nombre total de POI à 5 km
3. Score d'attractivité
4. Diversité des catégories

**Algorithme :** `NearestNeighbors(n_neighbors=10, metric='cosine')`

**Préprocessing :** StandardScaler sur l'ensemble des features

**Résultats — Stabilité@5 par profil :**

| Profil | Stabilité@5 | Interprétation |
|--------|-------------|----------------|
| **Entre amis** | 88 % | Très stable |
| **Famille** | 84 % | Stable |
| **Solo** | 78 % | Bonne |
| **Couple** | 76 % | Correcte |
| **Senior** | 76 % | Correcte |
| **Moyenne** | **80 %** | |

**Métrique de stabilité@5 :** Sur 10 exécutions avec ré-échantillonnage, pourcentage des 5 destinations recommandées qui restent identiques. Cette métrique est utilisée **faute de vérité terrain** (pas de données utilisateurs réelles).

**Limitation honnête :** Precision@5 et Recall@5 ne sont pas calculables sans données utilisateurs labellisées. Les profils sont éditoriaux (définis manuellement), pas appris. La recommandation est un **cold-start complet**.

**Export :** `models/knn_recommandation.pkl`

### 6.3 Synthèse ML

```
Données brutes (287 703 POI)
    │
    ▼
StandardScaler + OneHotEncoder
    │
    ├──▶ KMeans (k=15) ──▶ 15 clusters géo-thématiques
    │                            │
    │                            ▼
    │                    gold.poi_clusters
    │
    └──▶ Agrégation par gare (10 features)
              │
              ▼
         NearestNeighbors (cosinus, k=10)
              │
              ▼
         5 destinations × 5 profils = 25 recommandations
```

---

## 7. API BACKEND (FastAPI)

### 7.1 Architecture

L'API REST est construite avec **FastAPI 0.115** et expose des contrats JSON stables. Elle sert d'interface unique entre la base de données et le frontend.

**Fichiers :**
- `api/main.py` — Routes et endpoints (639 lignes)
- `api/db.py` — Connexion PostgreSQL (auto-détection driver psycopg v2/v3)
- `api/analyst.py` — Vues analytiques (overview, pipeline, ML, décision)
- `api/quality.py` — Rapport qualité des données
- `api/chat.py` — Chatbot intelligent
- `api/security.py` — Authentification JWT (PBKDF2-HMAC-SHA256)
- `api/navitia.py` — Horaires SNCF temps réel (API Navitia)

### 7.2 Endpoints

| Méthode | Route | Description | Cache |
|---------|-------|-------------|-------|
| GET | `/api/health` | Santé API + DB | — |
| GET | `/api/stats` | KPI page d'accueil | — |
| GET | `/api/destinations` | Liste filtrable (q, dept, catégorie, profil, score, tri) | — |
| GET | `/api/destinations/{nom}` | Détail + POI à proximité | — |
| GET | `/api/destinations/{nom}/mobilites` | Mobilité locale (Haversine) | — |
| GET | `/api/destinations/{nom}/schedules` | Horaires SNCF temps réel | 5 min |
| GET | `/api/recommandations/{profil}` | 5 destinations recommandées | — |
| GET | `/api/data-quality` | Rapport qualité complet | 5 min |
| GET | `/api/analyste/overview` | Vue d'ensemble analyste | 5 min |
| GET | `/api/analyste/decision` | Aide à la décision | 5 min |
| GET | `/api/ml-metrics` | Métriques ML (silhouette, stabilité) | 5 min |
| GET | `/api/pipeline` | Détail pipeline médaillon | 5 min |
| **POST** | **`/api/chat`** | **Chatbot en langage naturel** | — |
| POST | `/api/auth/register` | Inscription | — |
| POST | `/api/auth/login` | Connexion | — |
| GET | `/api/profile` | Profil utilisateur (auth) | — |
| GET/POST/DELETE | `/api/favorites` | Gestion des favoris (auth) | — |

### 7.3 Performance

- **Cache in-memory** : TTL 5 min pour les endpoints analytiques (réponse 20ms vs 3-8s)
- **Pool de connexions** : SQLAlchemy pool_size=5, max_overflow=10, pool_pre_ping=True
- **Requêtes paramétrées** : Protection contre l'injection SQL
- **CORS** : Whitelist stricte des origines autorisées

---

## 8. FRONTEND (React)

### 8.1 Stack frontend

| Bibliothèque | Version | Usage |
|--------------|---------|-------|
| React | 18 | UI composants |
| Vite | 5 | Build tool (HMR, tree-shaking) |
| Tailwind CSS | 3.4 | Design system utilitaire |
| React Router | 7 | Routing SPA |
| Recharts | 2.x | Graphiques (barres, radar, donuts) |
| Leaflet | 1.9 | Cartes interactives |
| html2canvas | 1.x | Export PDF/image des dashboards |

### 8.2 Parcours utilisateur : Voyageur

| Page | Description |
|------|-------------|
| **Home** | Hero inspirationnel (style Airbnb), formulaire de recherche, KPI animés |
| **Destinations** | Grille filtrable par département, catégorie, profil, score minimum |
| **Détail destination** | Fiche gare : POI, carte Leaflet, mobilité locale, horaires SNCF |
| **Carte** | Vue cartographique de toutes les destinations (Leaflet + markers) |
| **Mon Voyage** | Planificateur multi-étapes avec calcul CO₂ |
| **Profil** | Compte utilisateur, favoris, historique, badges |

### 8.3 Parcours utilisateur : Analyste

| Onglet | Description |
|--------|-------------|
| **Vue générale** | KPI, score qualité, top destinations, départements, catégories (Recharts) |
| **Tourisme** | Analyse catégorielle, départementale, KPI touristiques |
| **Carbone** | Impact CO₂ train vs voiture (ADEME), scénarios |
| **Profils** | Radar chart par profil voyageur, dominances catégorielles |
| **Territoires** | Data Quality : score 98.4/100, anomalies, pipeline Bronze/Silver/Gold |
| **Machine Learning** | Silhouette, stabilité@5, clusters, étapes du moteur de recommandation |
| **Justification** | Transparence : limites, données illustratives signalées, features réelles |

### 8.4 Chatbot Wandrail

Un assistant flottant (bulle en bas à droite) permet d'interroger la base en langage naturel :

- **Statistiques** : « Combien de gares ? » → requête COUNT sur silver.gares
- **Destinations** : « Où aller en Bretagne ? » → recherche par département
- **Thématiques** : « Destination nature » → filtre par catégorie POI
- **Info ville** : « Nantes » → fiche complète (score, POI, mobilité)
- **CO₂** : « Impact carbone du train » → calcul ADEME
- **Catégories** : « Quelles catégories ? » → agrégat silver.poi

**Implémentation :** Détection d'intent par mots-clés en français (pas de LLM externe), requêtes SQL dynamiques sur la base Supabase. Aucune dépendance à une API IA tierce.

### 8.5 Design system

Le frontend utilise des **tokens sémantiques Tailwind** pour le support light/dark mode :

| Token | Rôle |
|-------|------|
| `bg-bg` | Fond de page |
| `bg-card` | Fond de carte |
| `bg-card2` | Fond de carte secondaire |
| `text-ink` | Texte principal |
| `text-muted` | Texte secondaire |
| `border-line` | Bordures |
| `bg-eco` | Vert Wandrail (#0A5C36) |

**Palette dataviz** (`web/src/lib/dataviz.js`) : 6 couleurs accessibles pour les graphiques.

---

## 9. DÉPLOIEMENT ET INFRASTRUCTURE

### 9.1 Architecture de déploiement

```
GitHub (push) ──▶ Render (auto-deploy)
                     │
                     ├── wandrail-api (Python, FastAPI)
                     │     ├── Build: pip install -r requirements.txt
                     │     ├── Start: uvicorn main:app --host 0.0.0.0
                     │     └── Health: /api/health
                     │
                     ├── wandrail-web (Static site, React)
                     │     ├── Build: npm install && npm run build
                     │     └── Serve: dist/ (SPA rewrite → index.html)
                     │
                     └── Supabase (PostgreSQL 17)
                           ├── Schémas: silver, gold, userapp
                           └── Stockage: 303 Mo / 500 Mo
```

### 9.2 Variables d'environnement

| Service | Variable | Description |
|---------|----------|-------------|
| API | `DATABASE_URL` | Chaîne Supabase (sslmode=require) |
| API | `CORS_ORIGINS` | URL du frontend autorisée |
| API | `AUTH_SECRET` | Clé secrète JWT (générée par Render) |
| API | `NAVITIA_TOKEN` | Clé API SNCF pour horaires temps réel |
| Web | `VITE_API_BASE` | URL de l'API (`https://wandrail-api.onrender.com`) |

### 9.3 Fichier de déploiement

Le fichier `render.yaml` (Blueprint) permet de déployer les 2 services en un clic :

```yaml
services:
  - type: web
    name: wandrail-api
    runtime: python
    rootDir: api
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT

  - type: web
    name: wandrail-web
    runtime: static
    rootDir: web
    buildCommand: npm install && npm run build
    staticPublishPath: dist
```

---

## 10. QUALITÉ DES DONNÉES ET KPI

### 10.1 Score de qualité global : 98.4 / 100

Le score est calculé automatiquement par `api/quality.py` selon 4 dimensions :

| Dimension | Score | Détail |
|-----------|-------|--------|
| **Complétude** | 99.9 % | % de champs non-nuls critiques |
| **Validité** | 95.5 % | Coordonnées dans les bornes France, catégories reconnues |
| **Unicité** | 99.9 % | Taux de doublons gares et POI |
| **Intégrité** | 100.0 % | Clés étrangères valides Silver↔Gold |

### 10.2 KPI de la plateforme

| KPI | Valeur | Source |
|-----|--------|--------|
| Gares référencées | 2 782 | silver.gares |
| POI touristiques | 287 703 | silver.poi |
| Départements couverts | 94 | silver.gares DISTINCT |
| Stations de mobilité | 495 409 | silver.mobilites |
| Trajets analysés | 153 010 | gold.fait_voyage |
| Clusters POI | 15 | gold.poi_clusters |
| Profils voyageur | 5 | gold.dim_profil |
| Recommandations | 25 | gold.recommandations |
| Score qualité | 98.4/100 | quality.py |
| Anomalies détectées | 51 805 | Doublons POI principalement |

### 10.3 Anomalies identifiées

| Type d'anomalie | Nombre | Traitement |
|-----------------|--------|------------|
| Doublons POI | ~51 000 | Signalés dans le rapport, conservés (variantes d'un même lieu) |
| Coordonnées aberrantes | ~700 | Filtrés en Silver (hors France métropolitaine) |
| Destinations sans score | ~50 | Gares sans POI à proximité |
| Jointures invalides | 0 | Intégrité referentielle respectée |

---

## 11. CHATBOT INTELLIGENT

### 11.1 Architecture

Le chatbot Wandrail est un système de **question-réponse basé sur des règles** (rule-based QA) qui interroge directement la base de données PostgreSQL.

**Choix technique :** Pas de LLM externe pour éviter :
- Les coûts d'API
- La latence réseau
- Les hallucinations sur les données

**Implémentation :**
- `api/chat.py` : Détection d'intent par mots-clés français, requêtes SQL dynamiques
- `web/src/components/Chatbot.jsx` : Interface React flottante avec robot SVG animé

### 11.2 Intents supportés

| Intent | Exemples | Requête SQL |
|--------|----------|-------------|
| Stats globales | « Combien de gares ? » | `COUNT(*) FROM silver.gares` |
| Destination par thème | « Destination nature » | JOIN poi + dim_gare WHERE categorie = 'Nature' |
| Destination par département | « Où aller en Bretagne ? » | LIKE sur departement |
| Info ville | « Nantes » | Fiche complète gare + POI + mobilité |
| CO₂ | « Impact carbone » | Calcul ADEME (218 - 20 g/km) |
| Catégories | « Types de lieux » | GROUP BY categorie |
| Voyage | « Je veux aller à Lyon » | Détection ville + fiche complète |

### 11.3 Interface utilisateur

- **Bulle flottante** : Robot SVG animé (yeux bleus, antenne clignotante) avec point vert "en ligne"
- **Panel chat** : Header dark blue, messages bulles (user vert, bot gris), suggestions cliquables
- **Rendu markdown** : Gras (**texte**) rendu en `<strong>`
- **Responsive** : Fonctionne sur mobile et desktop

---

## 12. SÉCURITÉ

### 12.1 Authentification

- **Hachage** : PBKDF2-HMAC-SHA256 avec sel aléatoire (stdlib Python, pas de dépendance externe)
- **JWT** : Token d'accès avec expiration, clé secrète générée par Render
- **Protection routes** : `Depends(current_user_id)` sur les endpoints protégés

### 12.2 Protection des données

- **Requêtes paramétrées** : Toutes les requêtes SQL utilisent des paramètres nommés (`:param`) — aucune interpolation de chaînes
- **Validation Pydantic** : Tous les inputs POST sont validés (longueur, format, regex)
- **CORS** : Whitelist stricte des origines (`wandrail-web.onrender.com`)
- **Secrets** : `.env` jamais commité, `.gitignore` protège les fichiers sensibles
- **Rate limiting** : Pas implémenté côté API (confié au proxy Render)

---

## 13. TESTS ET VALIDATION

### 13.1 Validation des données

- **Score qualité automatique** : Calculé à chaque requête `/api/data-quality` (98.4/100)
- **7 index de performance** créés sur Supabase pour accélérer les requêtes critiques
- **Contrôle Bronze→Silver** : Vérification des coordonnées, codes UIC, catégories
- **Contrôle Silver→Gold** : Intégrité référentielle, scores non-nuls

### 13.2 Validation ML

- **KMeans** : Silhouette score (0.337) — modéré, documenté honnêtement
- **KNN** : Stabilité@5 (80% moyenne) — bonne reproductibilité
- **Absence de vérité terrain** : Documentée dans la page Justification de l'application

### 13.3 Validation frontend

- **`npm run build`** : Build de production sans erreur ni warning
- **Test manuel** : Navigation complète, dark mode, responsive, chatbot
- **ErrorBoundary** : Capture les erreurs React et affiche un message user-friendly

---

## 14. LIMITES ET PERSPECTIVES

### 14.1 Limites actuelles

| Limite | Impact | Mitigation |
|--------|--------|------------|
| **Pas de vérité terrain ML** | Impossible de calculer precision/recall | Stabilité@5 comme proxy |
| **Profils éditoriaux** | Recommandations basées sur des profils définis manuellement, pas appris | Itérer avec des données utilisateurs réelles |
| **Silhouette modéré (0.337)** | Clusters dominés par les catégories majoritaires | Étendre la grille k, ajouter des features |
| **Données météo manquantes** | Hook `useWeather.js` prêt mais pas branché | Intégrer Open-Meteo |
| **Tables vides** | evenements et cyclables : 0 lignes | Sources à identifier |
| **Free tier Render** | Service dort après 15 min d'inactivité | Passage au plan payant si production |

### 14.2 Perspectives d'évolution

1. **Données utilisateurs** : Tracker les clics et favoris → entraîner un modèle collaboratif
2. **Météo temps réel** : API Open-Meteo → recommandations adaptées à la météo
3. **Préférences utilisateur** : Nature/Culture/Mer/Bas carbone/PMR → filtrage fin
4. **Carte avancée** : Tuiles Positron, clusters dynamiques, filtres flottants
5. **A/B testing** : Comparer KNN vs modèle collaboratif sur de vrais utilisateurs
6. **MLOps** : MLFlow pour le tracking des expériences, Docker pour la reproductibilité
7. **Accessibilité** : Audit RGAA, support lecteur d'écran

---

## 15. ANNEXES

### 15.1 Arborescence du projet

```
wandrail/
├── api/                    # Backend FastAPI
│   ├── main.py             # Routes (21 endpoints)
│   ├── db.py               # Connexion PostgreSQL
│   ├── analyst.py          # Vues analytiques
│   ├── quality.py          # Rapport qualité
│   ├── chat.py             # Chatbot intelligent
│   ├── security.py         # Auth JWT
│   ├── navitia.py          # Horaires SNCF
│   └── requirements.txt    # Dépendances Python
├── web/                    # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/          # Pages (Home, Destinations, Analyste...)
│   │   ├── lib/            # API client, dataviz palette
│   │   └── App.jsx         # Routing principal
│   ├── tailwind.config.js  # Design tokens
│   └── vite.config.js      # Config build + proxy dev
├── scripts/                # Pipeline ETL (13 scripts)
├── models/                 # Modèles ML exportés (.pkl)
├── docs/                   # Métriques, diagrammes
├── data/dumps/             # Backup SQL (rollback)
├── render.yaml             # Blueprint déploiement Render
└── README.md               # Documentation développeur
```

### 15.2 Dépendances Python (api/requirements.txt)

```
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
psycopg[binary]==3.2.13
python-dotenv==1.0.1
requests==2.32.3
```

### 15.3 Dépendances JavaScript (web/package.json)

```
react 18, react-dom 18, react-router-dom 7
recharts 2.x, leaflet 1.9, react-leaflet 4.x
tailwindcss 3.4, @tailwindcss/forms
vite 5, @vitejs/plugin-react
html2canvas, dompurify
```

### 15.4 Commandes de lancement

```bash
# Backend (développement)
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (développement)
cd web
npm install
npm run dev

# Pipeline complet (données)
cd scripts
python 00_init_db.py
python 01_fetch_gares.py
# ... jusqu'à 12_media_migration.py
```

### 15.5 Facteurs d'émission CO₂ (ADEME)

| Mode | g CO₂ / km | Source |
|------|-----------|--------|
| Voiture | 218 | ADEME Base Carbone 2024 |
| TER | 30 | ADEME |
| TGV | 4 | ADEME |
| Bus | 103 | ADEME |

### 15.6 Glossaire

| Terme | Définition |
|-------|------------|
| **POI** | Point of Interest — lieu touristique géolocalisé |
| **BallTree** | Structure de données pour la recherche de plus proches voisins en coordonnées sphériques |
| **Haversine** | Formule de calcul de distance sur une sphère (latitude/longitude) |
| **Silhouette** | Métrique de qualité de clustering : cohésion intra-cluster vs séparation inter-cluster ([-1, 1]) |
| **Stabilité@5** | Pourcentage de recommandations identiques sur N exécutions indépendantes |
| **Cold start** | Situation où le système n'a aucune donnée utilisateur pour personnaliser |
| **Architecture Médaillon** | Pattern data lakehouse en 3 couches : Bronze (brut), Silver (nettoyé), Gold (agrégé) |
| **UIC** | Union Internationale des Chemins de fer — code identifiant unique d'une gare |

---

*Document généré le 7 juillet 2026 — Wandrail v2.0*
*Thilissa Amara — M1 Big Data & IA — SUP DE VINCI*
