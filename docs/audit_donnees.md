# Rapport d'Audit des Données
**Projet** : Tourisme en Train — Pays de la Loire  
**Date** : 2026-06-17  
**Auteure** : Thilissa Amara  
**Base** : `tourisme_train` — PostgreSQL port 5434

---

## 1. Vue d'ensemble de la base de données

| Schéma | Tables | Lignes totales | État |
|--------|--------|----------------|------|
| bronze | 6 tables | 23 669 | Partiellement rempli |
| silver | 9 tables | 30 213 | Partiellement rempli |
| gold | 9 tables | 23 733 | Opérationnel |
| userapp | 3 tables | 2 | En attente d'usage |

---

## 2. Couche Bronze — Données brutes

### bronze.gares_raw
- **6 469 lignes** — toutes les gares SNCF de France (pas encore filtrées PDL)
- Source : SNCF Open Data (`referentiel-gares-voyageurs`)
- Statut : OK

### bronze.poi_raw + bronze.points_interet
- **17 184 + 15 516 lignes** — deux tables pour les POI DATAtourisme PDL
- Anomalie : deux tables distinctes pour la même source → à consolider
- Source : DATAtourisme API (clé `0f58925d-4b95-4ca2-b41b-9d7ea9527421`)

### Tables vides (0 lignes)
| Table | Source attendue | Action |
|-------|-----------------|--------|
| `bronze.lignes_raw` | SNCF lignes PDL | Relancer `01_gares.py` partie lignes |
| `bronze.mobilites_raw` | API Nantes, GTFS bus | Relancer `03_mobilites.py` |

---

## 3. Couche Silver — Données nettoyées

### silver.gares — 254 gares
| Métrique | Valeur | Évaluation |
|----------|--------|------------|
| Total gares | 254 | Correct pour PDL |
| Avec coordonnées GPS | 254 (100%) | Excellent |
| Avec fréquentation | 164 (64,6%) | Acceptable |
| Communes distinctes | 230 | Correct |
| Départements détectés | 13 | **Anomalie** — PDL n'a que 5 départements |

**Anomalie gares** : 13 départements détectés au lieu de 5 (44, 49, 53, 72, 85).  
Cause probable : le filtre géographique par bounding box inclut des gares des régions voisines (Centre-Val de Loire, Bretagne).  
**Correction Phase 2** : ajouter un filtre explicite sur les codes département.

### silver.poi — 14 979 points d'intérêt
| Métrique | Valeur | Évaluation |
|----------|--------|------------|
| Total POI | 14 979 | Bon volume |
| Catégories distinctes | 8 | Voir déséquilibre ci-dessous |
| Communes couvertes | 1 031 | Bonne couverture PDL |
| POI avec note_moyenne | 0 (0%) | **Critique** |
| POI avec site web | 6 840 (45,7%) | Acceptable |

**Répartition par catégorie** (déséquilibre important) :

| Catégorie | Nb POI | % |
|-----------|--------|---|
| Hébergement | 8 286 | 55,3% |
| Autre | 3 960 | 26,4% |
| Culture | 1 327 | 8,9% |
| Nature | 730 | 4,9% |
| Patrimoine | 594 | 4,0% |
| Loisirs | 79 | 0,5% |
| Restauration | 2 | 0,01% |
| Événement | 1 | 0,007% |

**Anomalies POI** :
1. **notes manquantes** (100% à NULL) — la colonne `note_moyenne` n'a jamais été remplie. Le scraping DATAtourisme ne récupère pas les notes. Correction : générer des notes synthétiques basées sur la fréquentation ou utiliser des données OSM.
2. **Restauration = 2 et Événement = 1** — ces catégories sont quasi absentes. Probable problème de mapping des catégories DATAtourisme.
3. **Catégorie "Autre" à 26%** — trop générique, à recatégoriser en Phase 2.

### silver.poi_enrichi — 14 979 lignes
| Métrique | Valeur | Évaluation |
|----------|--------|------------|
| Distance moyenne gare↔POI | 9,7 km | Acceptable |
| Distance minimum | 0,02 km | OK |
| Distance maximum | 33,3 km | OK |
| POI à moins de 2 km d'une gare | 2 701 (18%) | Correct |
| POI à moins de 5 km d'une gare | 4 945 (33%) | Correct |

### Tables Silver vides
| Table | Raison | Impact |
|-------|--------|--------|
| `silver.mobilites` | Script 03 jamais terminé | Pas de mobilités locales dans l'app |
| `silver.lignes` | Source non ingérée | Pas de carte des lignes |
| `silver.evenements` | Non implémenté | Pas d'événements |
| `silver.cyclables` | Non implémenté | Pas de pistes cyclables |
| `silver.population` | Non implémenté | Pas de stats INSEE |

---

## 4. Couche Gold — Schéma en étoile

### État général : opérationnel
| Table | Lignes | Qualité |
|-------|--------|---------|
| `dim_gare` | 254 | OK |
| `dim_poi` | 14 979 | OK |
| `dim_profil` | 5 | OK |
| `dim_transport` | 7 | OK |
| `dim_temps` | 1 096 | OK (3 ans de dates) |
| `dim_region` | 5 | OK |
| `fait_voyage` | 6 350 | OK |
| `fait_co2` | 140 | OK |
| `poi_clusters` | 14 979 | Anomalie encodage |
| `recommandations` | 25 | OK (5 profils × 5 gares) |

**Anomalie clusters** : les noms de clusters ont un problème d'encodage (`Hébergement 2` → `H?bergement 2`). Cause : problème charset lors du stockage. Correction : relancer `06_ml_clustering.py` avec `client_encoding='utf8'`.

### Profils voyageurs (gold.dim_profil)
| ID | Profil | Description |
|----|--------|-------------|
| 1 | Famille | Famille avec enfants, activités variées |
| 2 | Solo | Voyageur solo, curieux et autonome |
| 3 | Couple | Couple, romantique et gastronomique |
| 4 | Groupe | Groupe d'amis, festif et sportif |
| 5 | Éco | Éco-responsable, mobilité douce |

---

## 5. Synthèse — Points critiques

### Bloquants (à corriger en Phase 2)
1. **Notes POI à 0%** — aucun POI n'a de note. Sans note, le KNN recommande sur des critères uniquement géographiques.
2. **Mobilités = 0 lignes** — l'app ne peut pas afficher les vélos/bus autour des gares.
3. **Encodage clusters** — les noms de clusters affichent des caractères corrompus dans l'app.
4. **Filtre département gares** — 13 départements au lieu de 5.

### Améliorations souhaitables (Phase 2-3)
5. **Catégorie "Autre" (26%)** — à recatégoriser.
6. **2 tables POI en bronze** — `poi_raw` et `points_interet` se chevauchent, à consolider.
7. **Restauration quasi absente** — enrichir depuis OSM ou Google Places API.

### Ce qui fonctionne bien
- Architecture Médaillon correctement implémentée
- 254 gares PDL avec coordonnées GPS complètes (100%)
- 14 979 POI avec enrichissement distances gare↔POI
- Gold layer complet avec modèles ML opérationnels
- Pipeline Airflow hebdomadaire configuré

---

## 6. Plan de correction (Phase 2)

```
Priorité 1 — Critique
  [ ] Générer notes_moyennes synthétiques pour silver.poi
  [ ] Corriger encodage cluster_nom dans gold.poi_clusters  
  [ ] Filtrer silver.gares sur codes_dept IN ('44','49','53','72','85')

Priorité 2 — Important  
  [ ] Relancer 03_mobilites.py → remplir silver.mobilites
  [ ] Recatégoriser POI "Autre" → sous-catégories DATAtourisme
  [ ] Consolider bronze.poi_raw et bronze.points_interet

Priorité 3 — Nice to have
  [ ] Enrichir Restauration depuis OSM (Overpass API)
  [ ] Ajouter silver.cyclables depuis données PDL
```

---

*Document généré lors de la Phase 1 — Audit technique du projet.*
