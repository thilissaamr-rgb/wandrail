# Scripts archivés

Anciennes variantes des scripts du pipeline, conservées pour référence.
**Ne pas exécuter** — le pipeline officiel utilise les scripts numérotés dans le
dossier parent [`scripts/`](../).

## Contenu

| Fichier | Statut | Remplacé par |
|---|---|---|
| `03_mobilites.py` | Extraction dédiée mobilités locales (Vélib, TER…) | Intégré dans `03_osm.py` |
| `05_frequentation.py` | Extraction fréquentation SNCF | Fusionné dans `05_gold_layer.py` |
| `06_scoring.py` | Score touristique heuristique | Remplacé par le score Gold + ML |
| `generer_carte.py` | Génération carte Folium standalone | Remplacé par la carte React Leaflet dans `web/` |
| `generer_carte_interactive.py` | Idem | Idem |
