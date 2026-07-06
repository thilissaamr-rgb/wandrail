# Audit complet Wandrail

**Date :** 3 juillet 2026

**Périmètre :** `api/`, `web/`, `scripts/`, `models/`, DAG Airflow et base PostgreSQL locale

**Référence :** cahier des charges Fondation SNCF - projet M1 Big Data & IA

## 1. Synthèse exécutive

Wandrail possède une base solide et démontrable : application React fonctionnelle, API FastAPI reliée à PostgreSQL, architecture Médaillon matérialisée, 26 099 POI enrichis, 136 gares et deux modèles sérialisés. Le projet n'a pas été refait ; les corrections ont ciblé les incohérences susceptibles d'être relevées par un jury.

Le principal défaut était un décalage entre le discours et le code : le dashboard affichait 100/100 à partir de trois taux de complétude, la page Méthodologie décrivait un autre usage de KMeans que celui implémenté, et les métriques KNN étaient présentées comme Precision@5/Recall@5 sans vérité terrain. Ces points sont corrigés et explicités.

**Score qualité courant : 98,6/100**, calculé et justifié par quatre dimensions :

| Dimension | Score | Poids |
|---|---:|---:|
| Complétude | 99,9 % | 25 % |
| Validité | 96,2 % | 35 % |
| Unicité | 99,9 % | 15 % |
| Intégrité | 100 % | 25 % |

Ce score élevé ne masque pas les anomalies : elles sont affichées séparément dans `/data-dashboard`.

## 2. Points forts

- Séparation claire entre frontend React, API FastAPI, traitements Python et modèles.
- Schémas PostgreSQL Bronze, Silver, Gold et `userapp` réellement présents.
- 136 gares avec code UIC unique, coordonnées valides, département PDL cohérent et fréquentation renseignée.
- 26 099 POI tous géolocalisés et reliés à une gare dans `silver.poi_enrichi`.
- Aucune clé orpheline détectée entre POI, enrichissements, gares, dimensions Gold et recommandations.
- 136 destinations avec score d'attractivité, sans score manquant.
- 25 recommandations valides : cinq destinations distinctes pour chacun des cinq profils.
- Requêtes API paramétrées et temps de réponse locaux généralement inférieurs à 100 ms, hors rapport qualité complet (environ 300 ms).
- Interface responsive validée à 390 px sans débordement horizontal.
- Build de production réussi et routes chargées à la demande.

## 3. Faiblesses et risques

### Données

- **3 doublons POI** selon la clé normalisée nom + latitude + longitude arrondies.
- **3 948 POI (15,1 %) en catégorie `Autre`**, ce qui limite l'interprétation métier et les profils ML.
- **20 POI sans département**, tous issus de l'enrichissement OSM.
- **26 099 notes POI absentes.** C'est désormais explicite et préférable aux pseudo-notes précédentes. DATAtourisme et OSM ne fournissent pas ici d'avis utilisateurs comparables.
- `bronze.lignes_raw`, `bronze.mobilites_raw`, `silver.lignes` et `silver.meteo` sont vides.
- `silver.evenements` contient cinq lignes de démonstration lorsque la clé OpenAgenda n'est pas configurée ; elles ne doivent pas être présentées comme des événements temps réel.
- Deux anciennes tables Bronze de POI (`poi_raw` et `points_interet`) coexistent encore. Une consolidation est nécessaire pour une traçabilité univoque.

### Pipeline

- L'ancien DAG lançait un bootstrap destructif chaque semaine et exécutait des dépendances en parallèle. Le DAG a été corrigé, mais un test d'intégration Airflow complet reste à exécuter dans les conteneurs.
- Plusieurs scripts recréent les tables par `TRUNCATE`; il n'existe pas encore de stratégie incrémentale, de reprise sur incident ou de conservation d'historique.
- Les traitements Haversine parcourent POI x gares en Python. Le volume régional reste acceptable, mais une extension nationale nécessiterait PostGIS, un index spatial ou un arbre de voisins.
- La migration est idempotente mais le projet ne possède pas encore de gestionnaire de migrations tel qu'Alembic.

### Machine Learning

- **KMeans :** 26 099 POI, features latitude/longitude standardisées et catégorie one-hot, `k=15`, silhouette **0,4342**.
- L'optimum KMeans reste à la borne haute de la grille 2-15. Les clusters sont encore dominés par la restauration et l'hébergement ; ils décrivent surtout des concentrations géographiques et catégorielles. Ils ne doivent pas être assimilés à des segments de voyageurs.
- **KNN :** 136 destinations, 11 features standardisées, recherche cosinus avec 10 voisins, puis top 5 par profil.
- La stabilité@5 varie de **0,92 à 1,00** sous une perturbation de 10 % du profil synthétique.
- **Precision@5 et Recall@5 ne sont pas calculables à ce stade**, faute de clics, notes ou jugements humains labellisés. Les anciennes valeurs proches de 1 mesuraient la stabilité, pas la pertinence.
- Les préférences des cinq profils sont éditoriales. Elles sont explicables mais non apprises à partir d'utilisateurs réels.

### API et sécurité

- Les favoris étaient protégés uniquement par un `user_id` envoyé par le client. Ils utilisent maintenant un jeton HMAC signé et expirant après 24 heures.
- Les mots de passe nouvellement créés utilisent PBKDF2-SHA256 avec 310 000 itérations ; la vérification reste compatible avec les comptes historiques.
- Les erreurs SQL sont transformées en réponse 503 générique ; les détails internes ne sont plus exposés par `/api/health`.
- Il reste à ajouter limitation de débit, révocation de session, récupération de mot de passe et journalisation structurée.
- Une clé DATAtourisme et des mots de passe figuraient dans l'historique du fichier Docker. Ils ont été retirés de la version courante, mais **la clé doit être révoquée et l'historique Git purgé** si elle était active.

### Frontend et UX

- Une vraie page 404 a été ajoutée.
- Les états de chargement et erreurs API existent sur les pages principales.
- Les recommandations montrent maintenant rang, score de correspondance et raison spécifique au profil.
- Le bundle initial de 814 kB a été fractionné. Les routes courantes pèsent environ 1 à 11 kB, la fiche destination restant le chunk le plus lourd à 435 kB à cause du PDF et de la cartographie.
- Les textes principaux ont été harmonisés en français. Une revue éditoriale exhaustive des textes historiques reste souhaitable.
- L'accessibilité clavier, les contrastes et la lecture par lecteur d'écran n'ont pas encore fait l'objet d'un audit WCAG complet.

## 4. Corrections réalisées

1. Nouveau calcul qualité depuis PostgreSQL : complétude, validité, unicité, intégrité, NULL, doublons, anomalies et volumes par couche.
2. Dashboard enrichi avec détail des anomalies et pipeline Bronze/Silver/Gold réel.
3. Séparation entre `note_moyenne` et `score_qualite_source`; les pseudo-notes sont devenues `NULL`.
4. Contraintes SQL sur notes et coordonnées, plus index sur gares, distances et recommandations.
5. KMeans corrigé : catégorie one-hot, échantillonnage aléatoire, grille élargie, mapping POI par identifiant.
6. KNN corrigé : stabilité@5 correctement nommée, Precision@5/Recall@5 à `null`, explications spécifiques aux profils.
7. Page Méthodologie réécrite selon le code réellement exécuté, avec limites et perspectives.
8. Rang KNN préservé dans le frontend et raisons affichées sur les cartes.
9. DAG Airflow non destructif et dépendances séquencées.
10. Authentification des favoris par jeton signé, validation des entrées et erreurs HTTP propres.
11. Secrets retirés de `docker-compose.yml` et variables documentées dans `.env.example`.
12. Page 404, amélioration des textes français et chargement différé des routes React.

## 5. Tests réalisés

- `python -m compileall -q api scripts airflow/dags` : réussi.
- `npm run build` : réussi, sans avertissement de chunk supérieur à 500 kB.
- Migration `scripts/11_data_quality_migration.py` : réussie et rejouable.
- Réentraînement KMeans : réussi, 26 099 POI insérés dans `gold.poi_clusters`.
- Réentraînement KNN : réussi, 25 recommandations insérées.
- Endpoints de lecture, validation 422, erreurs 404, authentification 401/403 et favoris authentifiés GET/POST/DELETE : validés localement.
- Navigation sur accueil, destinations, carte, dashboard, méthodologie, favoris et 404 : validée sans erreur console.
- Responsive 390 x 844 : aucun débordement sur les pages testées.
- `docker compose config --quiet` : réussi avec l'environnement local ; les secrets de production restent à configurer sur Render.

## 6. Améliorations restantes, par priorité

### Priorité 0 - avant publication

- Révoquer la clé DATAtourisme exposée et purger les secrets de l'historique Git.
- Configurer `AUTH_SECRET`, mots de passe Airflow/Grafana, `DATABASE_URL` et CORS sur Render.
- Exécuter une recette sur l'URL Render avec la base de production, pas seulement en local.

### Priorité 1 - soutenance Big Data & IA

- Recatégoriser les 3 948 POI `Autre` à partir des types RDF/DATAtourisme.
- Compléter les 20 départements OSM par jointure spatiale ou code postal.
- Constituer un jeu de 100 à 200 jugements humains profil-destination pour calculer une vraie Precision@5 et Recall@5.
- Justifier le choix de `k` par une grille élargie, la stabilité inter-runs et une interprétation métier des clusters.
- Ajouter des tests automatisés API, data quality et frontend dans une CI.

### Priorité 2 - industrialisation

- Passer à des migrations Alembic et à un pipeline incrémental.
- Utiliser PostGIS pour les distances et index spatiaux.
- Remplacer les événements de démonstration par une source datée et traçable.
- Alimenter lignes ferroviaires, météo et horaires réels.
- Ajouter monitoring, logs structurés, suivi de dérive et versionnement des modèles.
- Conduire un audit WCAG et un test de charge sur le périmètre France entière.

## 7. Conclusion

Le projet est désormais présentable comme un **prototype régional professionnel et honnête sur ses limites**. Il ne faut pas le vendre comme un moteur national ni comme un système de recommandation validé par des utilisateurs. Sa valeur pour la soutenance réside dans la chaîne complète et traçable données -> qualité -> features -> modèles -> API -> interface, ainsi que dans la capacité à expliquer précisément ce qui est mesuré, ce qui ne l'est pas encore, et pourquoi.

## 8. Extension finale : Espace Analyste

La plateforme propose désormais deux parcours dans la même application. Les nouvelles routes `/analyste`, `/analyste/data-quality`, `/analyste/pipeline`, `/analyste/ml` et `/analyste/decision` regroupent la vue d'ensemble, la qualité, le pipeline, les modèles et la décision territoriale. La route historique `/data-dashboard` reste compatible.

Les vues sont alimentées par les nouveaux endpoints `/api/analyste/overview`, `/api/anomalies`, `/api/pipeline`, `/api/ml-metrics`, `/api/analyste/decision` et `/api/top-destinations`. Les indicateurs de potentiel et de carbone incluent leur définition afin d'éviter toute interprétation causale ou promesse d'impact observé.
