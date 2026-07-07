"""Vues analytiques destinées à SNCF, collectivités et offices de tourisme."""

import json
from pathlib import Path

from sqlalchemy import text

from quality import build_data_quality_report


ROOT = Path(__file__).resolve().parent.parent


def _rows(result):
    return [dict(row._mapping) for row in result]


def _load_json(relative_path: str, fallback: dict) -> dict:
    try:
        with (ROOT / relative_path).open(encoding="utf-8") as stream:
            return json.load(stream)
    except (OSError, ValueError):
        return fallback


def build_overview(connection) -> dict:
    quality = build_data_quality_report(connection)
    recommendation_count = connection.execute(
        text("SELECT COUNT(*) FROM gold.recommandations")
    ).scalar_one()
    return {
        "kpi": {**quality["kpi"], "nb_recommandations": recommendation_count},
        "quality_score": quality["quality_score"],
        "quality_dimensions": quality["quality_dimensions"],
        "completude_geographique": round(
            (quality["completude"]["gares_geo_pct"] + quality["completude"]["poi_geo_pct"]) / 2,
            1,
        ),
        "anomalies_total": quality["anomalies_total"],
        "top_destinations": quality["top_destinations"],
        "top_departements": quality["top_departements"],
        "top_categories": quality["top_categories"],
    }


def build_pipeline(connection) -> dict:
    quality = build_data_quality_report(connection)
    counts = {layer["layer"]: layer for layer in quality["pipeline"]}
    stages = [
        {
            "id": "bronze",
            "label": "Bronze",
            "role": "Conserver les extractions brutes et leur traçabilité.",
            "rows": counts["bronze"]["rows"],
            "tables": counts["bronze"]["tables"],
            "controls": ["présence du fichier ou de la réponse API", "date d'extraction", "volume ingéré"],
            "transformations": ["aucune transformation métier", "stockage des champs source"],
        },
        {
            "id": "silver",
            "label": "Silver",
            "role": "Nettoyer, typer, géolocaliser et rapprocher gares et POI.",
            "rows": counts["silver"]["rows"],
            "tables": counts["silver"]["tables"],
            "controls": ["codes UIC uniques", "coordonnées France", "catégories normalisées", "doublons POI"],
            "transformations": ["filtrage ferroviaire", "BallTree / Haversine gare-POI", "temps de marche estimé"],
        },
        {
            "id": "gold",
            "label": "Gold",
            "role": "Produire les agrégats, dimensions, scores et features analytiques.",
            "rows": counts["gold"]["rows"],
            "tables": counts["gold"]["tables"],
            "controls": ["clés vers Silver", "scores présents", "cinq recommandations par profil"],
            "transformations": ["agrégats par rayon", "score d'attractivité", "schéma en étoile"],
        },
        {
            "id": "ml",
            "label": "Machine Learning",
            "role": "Structurer les POI et rechercher les destinations proches des préférences.",
            "rows": connection.execute(text("SELECT COUNT(*) FROM gold.poi_clusters")).scalar_one(),
            "tables": [
                {"table_name": "kmeans_poi.pkl", "rows": 1},
                {"table_name": "knn_recommandation.pkl", "rows": 1},
                {"table_name": "recommandations", "rows": connection.execute(text("SELECT COUNT(*) FROM gold.recommandations")).scalar_one()},
            ],
            "controls": ["silhouette", "stabilité@5", "explications par profil"],
            "transformations": ["standardisation", "one-hot encoding", "distance cosinus"],
        },
        {
            "id": "api",
            "label": "API",
            "role": "Servir des contrats JSON stables sans exposer les détails SQL.",
            "rows": None,
            "tables": [],
            "controls": ["validation Pydantic", "statuts HTTP", "requêtes paramétrées", "authentification"],
            "transformations": ["sérialisation JSON", "filtres et limites"],
        },
        {
            "id": "frontend",
            "label": "Frontend",
            "role": "Restituer deux parcours : Voyageur et Analyste.",
            "rows": None,
            "tables": [],
            "controls": ["responsive", "chargement", "erreurs API", "route 404"],
            "transformations": ["cartes KPI", "filtres", "visualisations et explications"],
        },
    ]
    return {"stages": stages, "generated_from": quality["generated_from"]}


def build_ml_metrics(connection) -> dict:
    kmeans = _load_json(
        "docs/metriques_kmeans.json",
        {"silhouette": 0.4342, "best_k": 15, "evaluation_status": "fallback_documente"},
    )
    knn = _load_json("docs/metriques_knn.json", {})
    cluster_distribution = _rows(
        connection.execute(
            text(
                """
                SELECT cluster_id, cluster_nom, COUNT(*) AS nb_poi,
                       ROUND(AVG(score_appartenance)::numeric, 3) AS appartenance_moyenne
                FROM gold.poi_clusters
                GROUP BY cluster_id, cluster_nom
                ORDER BY nb_poi DESC
                """
            )
        )
    )
    grid = kmeans.get("grid", [2, 15])
    best_k = kmeans.get("best_k")
    optimum_at_boundary = bool(grid and best_k in (grid[0], grid[-1]))
    return {
        "kmeans": {
            "objective": "Regrouper les POI selon leur position et leur catégorie.",
            "features": ["latitude", "longitude", "catégorie one-hot"],
            "preprocessing": ["StandardScaler sur les coordonnées", "OneHotEncoder sur la catégorie"],
            "n_clusters": best_k,
            "silhouette": kmeans.get("silhouette"),
            "grid": grid,
            "interpretation": "optimum en borne de grille" if optimum_at_boundary else "optimum intérieur à la grille testée",
            "limitation": "Les catégories majoritaires dominent encore certains groupes ; l'interprétation métier reste prudente.",
            "distribution": cluster_distribution,
        },
        "knn": {
            "objective": "Rechercher les destinations les plus proches d'un profil éditorial.",
            "features": [
                "8 volumes de POI par catégorie à 5 km",
                "nombre total de POI à 5 km",
                "score d'attractivité",
                "diversité des catégories",
            ],
            "preprocessing": ["StandardScaler", "NearestNeighbors k=10", "distance cosinus"],
            "metrics_by_profile": knn,
            "precision_at_5": None,
            "recall_at_5": None,
            "evaluation_status": "Non disponibles faute de données utilisateurs labellisées.",
        },
    }


def build_decision_support(connection) -> dict:
    high_potential = _rows(
        connection.execute(
            text(
                """
                SELECT nom_gare, commune, departement, score_attractivite AS score,
                       nb_poi_5km, nb_categories, nb_voyageurs_annuel
                FROM gold.dim_gare
                ORDER BY score_attractivite DESC, nb_poi_5km DESC
                LIMIT 8
                """
            )
        )
    )
    underused = _rows(
        connection.execute(
            text(
                """
                WITH seuil AS (
                    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY nb_voyageurs_annuel) AS trafic_median
                    FROM gold.dim_gare
                )
                SELECT nom_gare, commune, departement, score_attractivite AS score,
                       nb_poi_5km, nb_categories, nb_voyageurs_annuel,
                       ROUND((score_attractivite * (nb_poi_5km + 1) /
                             (nb_voyageurs_annuel / 1000.0 + 1))::numeric, 2) AS indice_opportunite
                FROM gold.dim_gare, seuil
                WHERE score_attractivite >= 2
                  AND nb_voyageurs_annuel <= seuil.trafic_median
                ORDER BY indice_opportunite DESC
                LIMIT 8
                """
            )
        )
    )
    poi_rich = _rows(
        connection.execute(
            text(
                """SELECT nom_gare, commune, departement, nb_poi_5km, score_attractivite AS score
                FROM gold.dim_gare ORDER BY nb_poi_5km DESC LIMIT 8"""
            )
        )
    )
    poi_sparse = _rows(
        connection.execute(
            text(
                """SELECT nom_gare, commune, departement, nb_poi_5km, score_attractivite AS score
                FROM gold.dim_gare ORDER BY nb_poi_5km ASC, score_attractivite ASC LIMIT 8"""
            )
        )
    )
    departments = _rows(
        connection.execute(
            text(
                """
                SELECT departement, COUNT(*) AS nb_gares, SUM(nb_poi_5km) AS nb_poi_5km,
                       ROUND(AVG(score_attractivite)::numeric, 2) AS score_moyen,
                       ROUND(AVG(nb_voyageurs_annuel)::numeric, 0) AS trafic_moyen
                FROM gold.dim_gare
                GROUP BY departement
                ORDER BY score_moyen DESC
                """
            )
        )
    )
    carbon = dict(
        connection.execute(
            text(
                """
                WITH routes AS (
                    SELECT DISTINCT id_gare, distance_depart_km, co2_economise_kg
                    FROM gold.fait_voyage
                    WHERE co2_economise_kg IS NOT NULL
                )
                SELECT COALESCE(ROUND(AVG(distance_depart_km)::numeric, 1), 415) AS distance_moyenne_km,
                       COALESCE(ROUND(AVG(co2_economise_kg)::numeric, 2), 78) AS economie_moyenne_kg_par_trajet,
                       COALESCE(ROUND((AVG(co2_economise_kg) * 1000)::numeric, 0), 78000) AS scenario_1000_voyageurs_kg
                FROM routes
                """
            )
        ).one()._mapping
    )
    return {
        "definitions": {
            "fort_potentiel": "Meilleurs scores d'attractivité, puis richesse en POI.",
            "sous_exploitee": "Score >= 2, trafic inférieur ou égal à la médiane, classé par offre touristique rapportée au trafic.",
            "carbone": "Scénario indicatif, non observé : économie moyenne train vs voiture multipliée par 1 000 voyageurs.",
        },
        "high_potential": high_potential,
        "underused": underused,
        "poi_rich": poi_rich,
        "poi_sparse": poi_sparse,
        "departments": departments,
        "carbon": carbon,
    }
