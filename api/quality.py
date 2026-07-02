"""Calculs de qualite des donnees exposes au dashboard Wandrail."""

from sqlalchemy import text


CANONICAL_CATEGORIES = (
    "Autre",
    "Commerce",
    "Culture",
    "Evenement",
    "Hebergement",
    "Loisirs",
    "Nature",
    "Patrimoine",
    "Restauration",
    "Sport & Loisirs",
)
PDL_DEPARTMENTS = ("44", "49", "53", "72", "85")


def _ratio(valid: int, total: int) -> float:
    return valid / total if total else 0.0


def _pct(value: float) -> float:
    result = round(value * 100, 1)
    # Ne jamais arrondir une dimension imparfaite a 100,0 %.
    if value < 1 and result >= 100:
        return 99.9
    return result


def _rows(result):
    return [dict(row._mapping) for row in result]


def build_data_quality_report(connection) -> dict:
    """Retourne un rapport calcule exclusivement depuis les tables courantes."""
    station = dict(
        connection.execute(
            text(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS geocoded,
                       COUNT(*) FILTER (WHERE latitude BETWEEN 46.2 AND 48.7
                                         AND longitude BETWEEN -2.7 AND 1.0) AS valid_coordinates,
                       COUNT(*) FILTER (WHERE code_departement IN ('44','49','53','72','85')) AS valid_department,
                       COUNT(*) - COUNT(DISTINCT code_uic) AS duplicates,
                       COUNT(*) FILTER (WHERE nom_gare IS NULL OR btrim(nom_gare) = '') AS missing_name,
                       COUNT(*) FILTER (WHERE nb_voyageurs_annuel IS NULL) AS missing_traffic
                FROM silver.gares
                """
            )
        ).one()._mapping
    )
    poi = dict(
        connection.execute(
            text(
                """
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) AS geocoded,
                       COUNT(*) FILTER (WHERE latitude BETWEEN 46.2 AND 48.7
                                         AND longitude BETWEEN -2.7 AND 1.0) AS valid_coordinates,
                       COUNT(*) FILTER (WHERE categorie IS NOT NULL AND btrim(categorie) <> '') AS categorized,
                       COUNT(*) FILTER (WHERE categorie <> 'Autre') AS specific_category,
                       COUNT(*) FILTER (WHERE note_moyenne IS NULL OR note_moyenne BETWEEN 0 AND 5) AS valid_rating,
                       COUNT(*) FILTER (WHERE departement IS NOT NULL AND btrim(departement) <> '') AS with_department,
                       COUNT(*) - COUNT(DISTINCT (
                           lower(btrim(nom)), round(latitude::numeric, 5), round(longitude::numeric, 5)
                       )) AS duplicates,
                       COUNT(*) FILTER (WHERE nom IS NULL OR btrim(nom) = '') AS missing_name,
                       COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_coordinates,
                       COUNT(*) FILTER (WHERE categorie IS NULL OR btrim(categorie) = '') AS missing_category,
                       COUNT(*) FILTER (WHERE note_moyenne IS NULL) AS missing_rating,
                       COUNT(*) FILTER (WHERE note_moyenne < 0 OR note_moyenne > 5) AS invalid_rating,
                       COUNT(*) FILTER (WHERE departement IS NULL OR btrim(departement) = '') AS missing_department,
                       COUNT(*) FILTER (WHERE categorie = 'Autre') AS other_category
                FROM silver.poi
                """
            )
        ).one()._mapping
    )
    integrity = dict(
        connection.execute(
            text(
                """
                SELECT
                  (SELECT COUNT(*) FROM silver.poi p LEFT JOIN silver.poi_enrichi e
                     ON e.id_poi = p.id WHERE e.id_poi IS NULL) AS poi_without_enrichment,
                  (SELECT COUNT(*) FROM silver.poi_enrichi e LEFT JOIN silver.poi p
                     ON p.id = e.id_poi WHERE p.id IS NULL) AS orphan_enrichment_poi,
                  (SELECT COUNT(*) FROM silver.poi_enrichi e LEFT JOIN silver.gares g
                     ON g.id = e.id_gare_1 WHERE g.id IS NULL) AS orphan_enrichment_station,
                  (SELECT COUNT(*) FROM silver.gares g LEFT JOIN gold.dim_gare d
                     ON d.code_uic = g.code_uic WHERE d.id IS NULL) AS station_without_gold,
                  (SELECT COUNT(*) FROM gold.dim_gare
                     WHERE score_attractivite IS NULL) AS destination_without_score,
                  (SELECT COUNT(*) FROM gold.recommandations r
                     LEFT JOIN gold.dim_gare g ON g.id = r.id_gare
                     LEFT JOIN gold.dim_profil p ON p.id = r.id_profil
                     WHERE g.id IS NULL OR p.id IS NULL) AS invalid_recommendation,
                  (SELECT COUNT(*) FROM gold.recommandations) AS recommendation_count,
                  (SELECT COUNT(*) FROM gold.dim_profil) AS profile_count
                """
            )
        ).one()._mapping
    )

    nb_destinations = connection.execute(
        text("SELECT COUNT(*) FROM gold.dim_gare WHERE score_attractivite IS NOT NULL")
    ).scalar_one()
    nb_departments = connection.execute(
        text("SELECT COUNT(DISTINCT code_departement) FROM silver.gares")
    ).scalar_one()

    station_total = station["total"]
    poi_total = poi["total"]
    score_coverage = _ratio(nb_destinations, station_total)
    completeness = (
        _ratio(station["geocoded"], station_total)
        + _ratio(poi["geocoded"], poi_total)
        + _ratio(poi["categorized"], poi_total)
        + _ratio(poi["with_department"], poi_total)
        + score_coverage
    ) / 5
    validity = (
        0.10 * _ratio(station["valid_coordinates"], station_total)
        + 0.10 * _ratio(poi["valid_coordinates"], poi_total)
        + 0.40 * _ratio(poi["valid_rating"], poi_total)
        + 0.25 * _ratio(poi["specific_category"], poi_total)
        + 0.15 * _ratio(station["valid_department"], station_total)
    )
    uniqueness = (
        _ratio(station_total - station["duplicates"], station_total)
        + _ratio(poi_total - poi["duplicates"], poi_total)
    ) / 2
    integrity_errors = sum(
        integrity[key]
        for key in (
            "poi_without_enrichment",
            "orphan_enrichment_poi",
            "orphan_enrichment_station",
            "station_without_gold",
            "destination_without_score",
            "invalid_recommendation",
        )
    )
    expected_recommendations = integrity["profile_count"] * 5
    integrity_ratio = (
        _ratio(poi_total - min(integrity_errors, poi_total), poi_total)
        + _ratio(integrity["recommendation_count"], expected_recommendations)
    ) / 2

    dimensions = {
        "completude": _pct(completeness),
        "validite": _pct(validity),
        "unicite": _pct(uniqueness),
        "integrite": _pct(integrity_ratio),
    }
    quality_score = round(
        0.25 * dimensions["completude"]
        + 0.35 * dimensions["validite"]
        + 0.15 * dimensions["unicite"]
        + 0.25 * dimensions["integrite"],
        1,
    )

    table_counts = _rows(
        connection.execute(
            text(
                """
                SELECT 'bronze' AS layer, 'gares_raw' AS table_name, COUNT(*) AS rows FROM bronze.gares_raw
                UNION ALL SELECT 'bronze', 'poi_raw', COUNT(*) FROM bronze.poi_raw
                UNION ALL SELECT 'bronze', 'lignes_raw', COUNT(*) FROM bronze.lignes_raw
                UNION ALL SELECT 'bronze', 'mobilites_raw', COUNT(*) FROM bronze.mobilites_raw
                UNION ALL SELECT 'silver', 'gares', COUNT(*) FROM silver.gares
                UNION ALL SELECT 'silver', 'poi', COUNT(*) FROM silver.poi
                UNION ALL SELECT 'silver', 'poi_enrichi', COUNT(*) FROM silver.poi_enrichi
                UNION ALL SELECT 'silver', 'mobilites', COUNT(*) FROM silver.mobilites
                UNION ALL SELECT 'silver', 'population', COUNT(*) FROM silver.population
                UNION ALL SELECT 'gold', 'dim_gare', COUNT(*) FROM gold.dim_gare
                UNION ALL SELECT 'gold', 'dim_poi', COUNT(*) FROM gold.dim_poi
                UNION ALL SELECT 'gold', 'recommandations', COUNT(*) FROM gold.recommandations
                ORDER BY layer, table_name
                """
            )
        )
    )
    pipeline = []
    for layer in ("bronze", "silver", "gold"):
        tables = [row for row in table_counts if row["layer"] == layer]
        pipeline.append(
            {
                "layer": layer,
                "rows": sum(row["rows"] for row in tables),
                "tables": tables,
                "empty_tables": sum(row["rows"] == 0 for row in tables),
            }
        )

    top_categories = _rows(
        connection.execute(
            text(
                """SELECT categorie AS label, COUNT(*) AS nb FROM silver.poi
                GROUP BY categorie ORDER BY nb DESC"""
            )
        )
    )
    top_departments = _rows(
        connection.execute(
            text(
                """SELECT departement AS label, COUNT(*) AS nb_gares FROM silver.gares
                GROUP BY departement ORDER BY nb_gares DESC"""
            )
        )
    )
    top_destinations = _rows(
        connection.execute(
            text(
                """
                SELECT g.commune, g.nom_gare, g.departement,
                       d.score_attractivite AS score, d.nb_poi_5km AS nb_poi
                FROM silver.gares g JOIN gold.dim_gare d ON d.code_uic = g.code_uic
                WHERE d.score_attractivite IS NOT NULL
                ORDER BY d.score_attractivite DESC LIMIT 10
                """
            )
        )
    )

    nulls = {
        "gares_nom": station["missing_name"],
        "gares_coordonnees": station_total - station["geocoded"],
        "gares_frequentation": station["missing_traffic"],
        "poi_nom": poi["missing_name"],
        "poi_coordonnees": poi["missing_coordinates"],
        "poi_categorie": poi["missing_category"],
        "poi_note": poi["missing_rating"],
        "poi_departement": poi["missing_department"],
    }
    anomalies = {
        "doublons_gares": station["duplicates"],
        "doublons_poi": poi["duplicates"],
        "coordonnees_gares_aberrantes": station_total - station["valid_coordinates"],
        "coordonnees_poi_aberrantes": poi_total - poi["valid_coordinates"],
        "notes_poi_invalides": poi["invalid_rating"],
        "categories_autre": poi["other_category"],
        "departements_gares_invalides": station_total - station["valid_department"],
        "jointures_invalides": integrity_errors,
        "destinations_sans_score": integrity["destination_without_score"],
        "recommandations_invalides": integrity["invalid_recommendation"],
    }

    return {
        "generated_from": "PostgreSQL - tables courantes",
        "kpi": {
            "nb_gares": station_total,
            "nb_gares_geo": station["geocoded"],
            "nb_poi": poi_total,
            "nb_poi_geo": poi["geocoded"],
            "nb_dest_analysees": nb_destinations,
            "nb_departements": nb_departments,
            "nb_profils": integrity["profile_count"],
        },
        "completude": {
            "gares_geo_pct": _pct(_ratio(station["geocoded"], station_total)),
            "poi_geo_pct": _pct(_ratio(poi["geocoded"], poi_total)),
            "analyses_pct": _pct(score_coverage),
            "poi_departement_pct": _pct(_ratio(poi["with_department"], poi_total)),
        },
        "quality_score": quality_score,
        "quality_dimensions": dimensions,
        "quality_methodology": {
            "weights": {"completude": 25, "validite": 35, "unicite": 15, "integrite": 25},
            "note": "La validite pondere fortement les notes POI et les categories exploitables par le ML.",
        },
        "nulls": nulls,
        "nulls_total": sum(nulls.values()),
        "anomalies": anomalies,
        "anomalies_total": sum(anomalies.values()),
        "pipeline": pipeline,
        "top_categories": top_categories,
        "top_departements": top_departments,
        "top_destinations": top_destinations,
    }
