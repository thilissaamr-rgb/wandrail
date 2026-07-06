<div align="center">

# 🚆 Wandrail

**Le tourisme en train, autrement — plateforme Big Data & IA**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![scikit--learn](https://img.shields.io/badge/scikit--learn-1.5-F7931E?logo=scikit-learn&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.9-8884d8)
![License MIT](https://img.shields.io/badge/License-MIT-yellow)

[🌐 Démo live](https://wandrail-web.onrender.com) · Projet M1 BDIA · Sup de Vinci · RNCP40167

</div>

---

## Architecture

```
SNCF Open Data + DATAtourisme + OpenStreetMap + INSEE + Navitia
                          │
                          ▼
        Bronze → Silver → Gold → ML → FastAPI → React
```

| Couche | Rôle |
|---|---|
| **Bronze / Silver / Gold** | Extraction, nettoyage, agrégats — PostgreSQL 16 |
| **ML** | K-means (k=14, silhouette 0,324) + KNN cosine |
| **API** | FastAPI + JWT + Navitia SNCF — [`api/`](api/) |
| **Web** | React 18 + Vite + Tailwind + Recharts + Leaflet — [`web/`](web/) |

## Fonctionnalités

### Espace Voyageur
- 🎬 Hero cinématique 4 photos (effet Ken Burns)
- 🔍 Recherche 6 champs (départ / voyageurs / budget / temps / envies)
- 🌦️ Météo Open-Meteo (3 jours)
- 🚄 **Horaires SNCF temps réel** (API Navitia, cache 5 min)
- 🗺️ **Carte Leaflet** style Google Maps + auto-zoom + navigation étape par étape (OSRM)
- 🚴 **Mobilité locale interactive** (23 935 arrêts bus, 475 vélos libre-service, 388 trams)
- 👤 **Profil utilisateur** : avatar upload + badges illustrés
- 🌓 Dark mode complet

### Espace Analyste (`/analyste`)
- 📊 Vue générale : 6 graphes Recharts (répartition, top villes, radar qualité, projection CO₂)
- 🌍 Territoires : ScatterChart potentiel × opportunité
- 🌱 Carbone : comparaison ADEME train/voiture
- 👥 Profils voyageur : 5 profils avec top 5 recommandations
- 🤖 Machine Learning : silhouette, distribution clusters, stabilité KNN
- 🎓 **Justification** : elbow, feature importance, radar stabilité, baseline vs ML

## Démarrage local

```bash
docker compose up -d
cd api && pip install -r requirements.txt && uvicorn main:app --reload
cd ../web && npm install && npm run dev
```

→ <http://localhost:5173>

## Sources de données

| Source | Ingérée dans | Script |
|---|---|---|
| SNCF Open Data (gares) | Bronze → Silver | [`scripts/01_gares.py`](scripts/01_gares.py) |
| DATAtourisme (POI) | Bronze → Silver | [`scripts/02_datatourisme.py`](scripts/02_datatourisme.py) |
| OpenStreetMap (mobilités) | Silver | [`scripts/03_osm.py`](scripts/03_osm.py) |
| INSEE (communes) | Silver | [`scripts/10_insee.py`](scripts/10_insee.py) |
| **SNCF Navitia** (horaires + référentiel gares) | Bronze + Runtime | [`scripts/13_navitia_gares.py`](scripts/13_navitia_gares.py) + [`api/navitia.py`](api/navitia.py) |

Pipeline orchestré par Airflow ([`airflow/dags/tourisme_dag.py`](airflow/dags/tourisme_dag.py)).

## License

[MIT](LICENSE) © 2026 Thilissa Amara
