# Audit national Wandrail — 5 juillet 2026

## Périmètre vérifié

France métropolitaine, à partir du référentiel officiel SNCF `gares-de-voyageurs`, du flux national DATAtourisme, de l’API géographique de l’État et des couches PostgreSQL Bronze, Silver et Gold.

## Résultats calculés

- 2 782 gares voyageurs SNCF avec code UIC unique ;
- 294 741 POI DATAtourisme complets en Bronze ;
- 287 498 POI géocodés et dédupliqués en Silver ;
- 287 498 associations POI–gares calculées par BallTree ;
- 34 386 communes issues de la source officielle ;
- 2 782 destinations Gold avec score ;
- 14 clusters KMeans, silhouette 0,324 sur un échantillon d’évaluation de 5 000 POI ;
- 25 recommandations KNN expliquées pour cinq profils ;
- score qualité global 98,4/100 avant la dernière actualisation SNCF.

Le score n’est pas parfait : 51 723 POI sont encore classés `Autre` et neuf doublons résiduels sont signalés. Les notes utilisateur absentes sont suivies comme valeurs NULL, mais ne sont pas inventées.

## Points forts

- pipeline national reproductible et séparation Bronze / Silver / Gold ;
- conservation du JSON DATAtourisme complet en Bronze ;
- ingestion ZIP en streaming et insertions SQL par lots ;
- rapprochement spatial scalable par BallTree/Haversine ;
- données démographiques officielles, sans valeurs approximatives ;
- métriques ML recalculées et limites documentées ;
- recommandations accompagnées de raisons factuelles ;
- API paramétrée et dashboard alimenté depuis la base courante.

## Faiblesses et risques

- Bronze représente environ 8,23 Gio de JSON décompressé : prévoir stockage, sauvegarde et rétention ;
- la catégorie `Autre` reste surreprésentée et réduit l’interprétabilité des clusters ;
- Precision@5 et Recall@5 ne sont pas calculables sans vérité terrain utilisateur ;
- les distances sont géographiques, pas des temps ferroviaires réels ;
- OSM via Overpass est désactivé en mode national pour ne pas surcharger un service public ;
- la Corse n’apparaît pas dans le référentiel SNCF national utilisé ;
- un test de charge Render reste nécessaire avant une mise en production publique.

## Corrections réalisées

- remplacement du flux DATAtourisme régional par le webservice national configurable ;
- prise en charge de l’archive ZIP contenant un fichier JSON par POI ;
- remplacement du référentiel SNCF obsolète par `gares-de-voyageurs` ;
- résolution commune, département et région par codes INSEE ;
- suppression des filtres Pays de la Loire dans le cœur du pipeline ;
- correction de la contrainte d’unicité des communes par code INSEE ;
- remplacement du produit cartésien POI × gares par BallTree ;
- reconstruction de Gold et réentraînement KMeans/KNN ;
- carte nationale, limites API adaptées et textes méthodologiques actualisés ;
- configuration locale PostgreSQL stabilisée en IPv4.

## Corrections UX et identité visuelle

- intégration du logo Wandrail détouré, sans arrière-plan coloré parasite ;
- thème clair blanc pur et thème sombre noir pur, vérifiés dans le navigateur ;
- navigation publique recentrée sur Accueil, Explorer, Carte et Mon voyage ;
- maintien des routes Analyste et Méthodologie pour la soutenance, hors du menu voyageur ;
- profils voyageurs harmonisés : Famille, Solo, Couple, Entre amis et Senior ;
- séparation des envies DATAtourisme (nature, gastronomie, culture, patrimoine, hébergement, loisirs, événements) et des profils ;
- filtre API et interface par catégorie DATAtourisme ;
- correction de la capitalisation des noms de lieux et de la recherche d’images Wikipédia ;
- remplacement de la photo de train de fret par un TGV Duplex en France, avec attribution CC BY-SA 3.0 ;
- validation responsive sans débordement, en modes clair et sombre.

## Refonte produit voyageur

- carte nationale transformée en explorateur progressif : 69 groupes au niveau national sur ordinateur et 29 sur mobile, au lieu de 2 782 cercles superposés ;
- fond CARTO clair/sombre, icônes gare, recherche, filtres d’envies et fiche destination directement dans la carte ;
- rendu limité à la zone visible après zoom afin de préserver la fluidité ;
- page `Mon voyage` utilisable sans connexion pour retrouver les itinéraires sauvegardés localement ;
- favoris synchronisés conservés pour les utilisateurs connectés ;
- suppression du faux billet, remplacé par un récapitulatif PDF explicitement non contractuel ;
- fiche destination enrichie avec raisons factuelles, lieux à ne pas manquer, météo actuelle Open‑Meteo et marqueurs différenciés pour restaurants, hébergements, culture, patrimoine, nature, loisirs et événements ;
- accueil recentré sur une recherche réellement appliquée (destination et département) et des inspirations visuelles ;
- aucune réservation, aucun horaire et aucun tarif réel ne sont inventés : l’achat reste redirigé vers SNCF Connect.
- suppression de tous les émojis système utilisés comme icônes, remplacés par un jeu SVG Wandrail homogène sur l’accueil, la carte, les POI et « Mon voyage » ;
- métadonnées de l’onglet corrigées pour supprimer l’ancienne référence régionale « Pays de la Loire ».
- extraction de 94 618 photos officielles DATAtourisme depuis Bronze vers Silver, avec crédit ; suppression complète des images Picsum sans rapport avec les lieux ;
- nettoyage visuel des libellés DATAtourisme entourés de crochets et suppression de la mention répétitive « non noté » ;
- fiche destination limitée par défaut aux douze suggestions les plus pertinentes (quatre catégories, trois lieux chacune) ;
- police unique Inter et palette limitée au blanc, noir, gris et vert Wandrail ;
- espace utilisateur réel après connexion : indicateurs de trajets, villes, CO₂, favoris, voyages préparés, trajets récents et préférences modifiables ;
- API sécurisée `GET/PATCH /api/profile` et préférences stockées en JSONB.

## Améliorations restantes

1. Recatégoriser les POI `Autre` à partir de l’ontologie complète DATAtourisme.
2. Mettre en place des chargements incrémentaux et une politique de rétention Bronze.
3. Utiliser PostGIS pour les requêtes spatiales et les contrôles géographiques avancés.
4. Ajouter des temps de trajet ferroviaires réels et un départ choisi par l’utilisateur.
5. Constituer un jeu d’évaluation humain pour Precision@5 et Recall@5.
6. Charger OSM national depuis des extraits Geofabrik plutôt que l’API Overpass publique.
7. Réaliser un test de charge, une sauvegarde restaurable et un suivi de dérive des modèles.
