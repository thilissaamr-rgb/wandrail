# Démonstration Wandrail - scénario jury 5 minutes

## Objectif du discours

Présenter Wandrail comme une plateforme unique avec deux parcours : un service de découverte pour les voyageurs et un data product d'aide à la décision pour SNCF et les territoires.

## 0:00 - 0:35 | Problématique

> Le transport représente la majorité de l'empreinte carbone du tourisme. Pourtant, les voyageurs connaissent mal les destinations accessibles en train et l'offre touristique autour des gares. Wandrail transforme des données ouvertes en recommandations compréhensibles et en indicateurs territoriaux.

Montrer rapidement l'accueil et annoncer le périmètre honnête : France métropolitaine, données DATAtourisme nationales et gares voyageurs SNCF.

## 0:35 - 1:35 | Espace Voyageur

1. Ouvrir `/destinations`.
2. Choisir le profil **Solo** ou **Famille**.
3. Montrer les cinq recommandations classées.
4. Lire une justification : nombre de lieux culturels, patrimoine, POI proches et score d'attractivité.

Message clé : le modèle ne renvoie pas seulement un score ; il explique les signaux ayant conduit au résultat.

## 1:35 - 2:15 | Fiche destination

1. Ouvrir Nantes, Angers ou Le Mans.
2. Montrer le score d'attractivité, l'EcoScore, les POI à proximité et la carte.
3. Présenter la comparaison train/voiture comme une estimation fondée sur des facteurs moyens, pas comme une mesure individuelle exacte.

Message clé : Wandrail relie accessibilité ferroviaire, richesse touristique et impact carbone.

## 2:15 - 2:45 | Passage à l'Espace Analyste

Ouvrir **Espace Analyste** dans la navigation.

Montrer :

- 136 gares ;
- 26 099 POI ;
- 25 recommandations ;
- score qualité 98,6/100 ;
- top destinations, catégories et départements.

Message clé : les indicateurs sont calculés depuis PostgreSQL, pas codés en dur dans l'interface.

## 2:45 - 3:20 | Qualité Data

Ouvrir `/analyste/data-quality`.

Insister sur les anomalies visibles :

- 3 doublons POI ;
- 3 948 catégories `Autre` ;
- 20 départements POI manquants ;
- notes utilisateurs absentes et représentées honnêtement par `NULL`.

Message clé : le 98,6/100 est décomposé en complétude, validité, unicité et intégrité. Wandrail ne masque pas les faiblesses derrière une note globale.

## 3:20 - 3:50 | Pipeline

Ouvrir `/analyste/pipeline`.

Suivre visuellement :

> Bronze conserve le brut, Silver nettoie et rapproche les POI des gares, Gold agrège et calcule les scores, les modèles produisent clusters et recommandations, FastAPI sert le JSON, React construit les deux parcours.

Mentionner qu'Airflow orchestre le pipeline et que l'initialisation destructive a été retirée du DAG récurrent.

## 3:50 - 4:25 | IA et limites

Ouvrir `/analyste/ml`.

- KMeans : latitude, longitude, catégorie one-hot, 15 clusters, silhouette 0,4342.
- KNN : 11 features standardisées, distance cosinus, top 5 par profil.
- stabilité@5 : 0,92 à 1,00.
- Precision@5 et Recall@5 : non disponibles faute de labels utilisateurs.

Message clé : les métriques sont présentées sans exagération. La prochaine étape est un jeu de jugements humains profil-destination.

## 4:25 - 4:50 | Décision SNCF

Ouvrir `/analyste/decision`.

Montrer les destinations à fort potentiel, les opportunités sous-exploitées et la comparaison départementale. Expliquer que « sous-exploitée » signifie ici : score touristique suffisant, trafic sous la médiane et offre POI rapportée au trafic.

Présenter le carbone comme un scénario de 1 000 voyageurs, jamais comme un impact observé.

## 4:50 - 5:00 | Conclusion

> Wandrail démontre une chaîne complète : données ouvertes, qualité, enrichissement géographique, modèles explicables, API et expérience utilisateur. La plateforme aide à la fois le voyageur à choisir et les territoires à identifier ce qu'ils peuvent mieux valoriser autour du train.

## Questions probables du jury

### Pourquoi KMeans si les clusters sont imparfaits ?

Il s'agit d'une exploration de structure des POI. Sur le jeu national, k=14 maximise la silhouette (0,324) dans la grille 2–15. Le déséquilibre des catégories limite encore l'interprétation ; le modèle reste un prototype explicable.

### Pourquoi pas de vraie Precision@5 ?

Parce qu'aucun historique de clic ou jugement humain n'existe. Calculer cette métrique contre le propre classement du modèle serait trompeur. Wandrail affiche donc la stabilité et documente le protocole nécessaire pour une vraie évaluation.

### Le CO₂ est-il exact ?

Non. C'est une estimation comparative basée sur des facteurs moyens et une distance. Elle sert à sensibiliser et à comparer des scénarios, pas à produire un bilan carbone certifié.

### Comment le passage à l’échelle nationale est-il maîtrisé ?

Le flux ZIP national est lu en streaming et inséré par lots. L’association POI–gares utilise un index BallTree plutôt qu’un produit cartésien. Les indicateurs restent calculés depuis la base et des tests de charge demeurent nécessaires avant une exploitation à fort trafic.
