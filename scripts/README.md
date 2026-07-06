# Pipeline scripts

Scripts d'ingestion et de transformation, numérotés selon l'ordre d'exécution
Bronze → Silver → Gold → ML → Migrations.

## Pipeline officiel

| Script | Rôle | Couche |
|---|---|---|
| `00_init_db.py` | Bootstrap PostgreSQL (schemas bronze/silver/gold/userapp) | Init |
| `01_gares.py` | Extraction SNCF Open Data + géocodage | Bronze → Silver |
| `02_datatourisme.py` | Extraction DATAtourisme (POI nationaux) | Bronze → Silver |
| `03_osm.py` | Enrichissement OpenStreetMap (mobilités locales) | Silver |
| `04_enrichissement.py` | Jointure gares × POI (BallTree/Haversine 5 km) | Silver |
| `05_gold_layer.py` | Agrégats Gold, scores, dimensions étoile | Gold |
| `06_ml_clustering.py` | K-means POI (k=14, silhouette 0,324) | ML |
| `07_ml_recommandation.py` | KNN cosine par profil voyageur | ML |
| `08_navitia.py` | Isochrones train (temps trajet gare → gare) | Enrichissement |
| `09_evenements.py` | Événements (festivals, expos) | Silver |
| `10_insee.py` | Données INSEE (34 386 communes) | Silver |
| `11_data_quality_migration.py` | Rapport qualité + anomalies | Migration |
| `12_media_migration.py` | Migration photos (Wikimedia REST) | Migration |

## Fichiers auxiliaires

- [`setup_app_tables.sql`](setup_app_tables.sql) — schema `userapp` (users, favoris, préférences)
- [`archive/`](archive/) — anciennes variantes conservées pour référence (non utilisées dans le pipeline)

## Exécution

Voir la section **Installation complète** du [README racine](../README.md).
