# Rapport de qualité des données Wandrail

**Dernière vérification :** 3 juillet 2026

**Périmètre :** base PostgreSQL locale, région Pays de la Loire

## Synthèse

| Indicateur | Valeur | Lecture |
|---|---:|---|
| Score global | 98,6/100 | Score pondéré et justifié |
| Complétude | 99,9 % | 20 départements POI manquants |
| Validité | 96,2 % | pénalité liée aux catégories peu précises |
| Unicité | 99,9 % | 3 doublons POI détectés |
| Intégrité | 100 % | aucune jointure cassée détectée |

Le score global ne remplace pas les anomalies détaillées. Une dimension imparfaite n'est jamais arrondie à 100 %.

## Gares

- 136 gares Silver ;
- 136 codes UIC distincts ;
- 0 doublon de code UIC ;
- 0 nom manquant ;
- 0 coordonnée manquante ou hors emprise régionale ;
- 5 départements attendus et présents : 44, 49, 53, 72, 85 ;
- 0 fréquentation manquante.

## Points d'intérêt

- 26 099 POI Silver ;
- 26 099 coordonnées présentes et dans l'emprise contrôlée ;
- 3 doublons selon nom normalisé + coordonnées arrondies ;
- 3 948 POI classés `Autre` (15,1 %) ;
- 20 départements manquants, issus d'OSM ;
- 26 099 notes utilisateurs absentes.

L'absence de note est désormais représentée par `NULL`. L'ancien score technique DATAtourisme est conservé séparément dans `score_qualite_source` et n'est plus affiché comme un avis utilisateur.

### Répartition des catégories

| Catégorie | POI |
|---|---:|
| Restauration | 10 900 |
| Hébergement | 8 331 |
| Autre | 3 948 |
| Culture | 1 320 |
| Nature | 925 |
| Patrimoine | 596 |
| Loisirs | 79 |

## Jointures et Gold

- 0 POI sans enrichissement gare ;
- 0 enrichissement orphelin ;
- 0 gare Silver absente de `gold.dim_gare` ;
- 0 destination sans score ;
- 25 recommandations valides ;
- 5 recommandations distinctes pour chacun des 5 profils.

## Volumes utiles

| Couche | Table | Lignes |
|---|---|---:|
| Bronze | `gares_raw` | 6 469 |
| Bronze | `poi_raw` | 17 198 |
| Silver | `gares` | 136 |
| Silver | `poi` | 26 099 |
| Silver | `poi_enrichi` | 26 099 |
| Silver | `mobilites` | 45 162 |
| Gold | `dim_gare` | 136 |
| Gold | `dim_poi` | 26 099 |
| Gold | `poi_clusters` | 26 099 |
| Gold | `recommandations` | 25 |

## Tables ou sources incomplètes

- `bronze.lignes_raw` : vide ;
- `bronze.mobilites_raw` : vide, alors que les mobilités Silver sont alimentées depuis OSM ;
- `silver.lignes` : vide ;
- `silver.meteo` : vide ;
- `silver.evenements` : cinq lignes de démonstration si OpenAgenda n'est pas configuré ;
- deux tables Bronze historiques de POI coexistent encore.

## Priorités data

1. Recatégoriser les 3 948 POI `Autre` à partir des types RDF/DATAtourisme.
2. Compléter les 20 départements OSM par jointure spatiale ou code postal.
3. Consolider les tables Bronze POI historiques.
4. Alimenter lignes ferroviaires et événements avec une source réelle datée.
5. Ajouter des tests de qualité automatisés au DAG Airflow.
