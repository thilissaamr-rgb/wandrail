"""
Carte interactive Folium — HeatMap douce sur fond Satellite
"""
import sys, os, webbrowser
sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
import folium
from folium.plugins import HeatMap, MiniMap, Fullscreen, MarkerCluster
from sqlalchemy import create_engine

engine = create_engine("postgresql://postgres:00000@localhost:5434/tourisme_train")

# ── Données ─────────────────────────────────────────────────
df_gares = pd.read_sql("""
    SELECT nom_gare, commune, departement, latitude, longitude,
           score_attractivite, profil_touristique, nb_poi_5km,
           nb_categories, nb_voyageurs_annuel
    FROM gold.dim_gare
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
""", engine)

df_poi = pd.read_sql("""
    SELECT nom, categorie, commune, latitude, longitude, cluster_nom
    FROM gold.dim_poi
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    LIMIT 5000
""", engine)

print(f"✅ {len(df_gares)} gares | {len(df_poi)} POI chargés")

# ── Carte centrée sur Pays de la Loire ──────────────────────
m = folium.Map(
    location=[47.5, -0.6],
    zoom_start=8,
    tiles=None,
    control_scale=True,
    zoom_control=True
)
# Force le zoom sur PDL
m.fit_bounds([[46.2, -2.7], [48.7, 1.2]])

# 🛰️ Satellite ESRI (défaut)
folium.TileLayer(
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr='Esri World Imagery',
    name='🛰️ Satellite',
    overlay=False, control=True, show=True
).add_to(m)

# 🗺️ OpenStreetMap
folium.TileLayer(
    tiles='OpenStreetMap',
    attr='OpenStreetMap',
    name='🗺️ OpenStreetMap',
    overlay=False, control=True, show=False
).add_to(m)

# 🌑 Dark
folium.TileLayer(
    tiles='CartoDB dark_matter',
    attr='CartoDB',
    name='🌑 Dark',
    overlay=False, control=True, show=False
).add_to(m)

# ☁️ Minimaliste clair
folium.TileLayer(
    tiles='CartoDB positron',
    attr='CartoDB',
    name='☁️ Minimaliste',
    overlay=False, control=True, show=False
).add_to(m)

# 🏔️ Relief topographique ESRI
folium.TileLayer(
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attr='Esri World Topo',
    name='🏔️ Relief / Topo',
    overlay=False, control=True, show=False
).add_to(m)

# 🛣️ Rues ESRI
folium.TileLayer(
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attr='Esri World Street Map',
    name='🛣️ Plan des rues',
    overlay=False, control=True, show=False
).add_to(m)

# 🌿 OpenTopoMap (terrain naturel)
folium.TileLayer(
    tiles='https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attr='OpenTopoMap',
    name='🌿 Terrain naturel',
    overlay=False, control=True, show=False
).add_to(m)

# 🌊 ESRI Ocean
folium.TileLayer(
    tiles='https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attr='Esri Ocean',
    name='🌊 Océan / Relief marin',
    overlay=False, control=True, show=False
).add_to(m)

# Plugins
Fullscreen(position='topright').add_to(m)
MiniMap(toggle_display=True, tile_layer='CartoDB positron').add_to(m)

# ── HeatMap Gares — couleurs douces ─────────────────────────
heat_data = [
    [row['latitude'], row['longitude'], row['score_attractivite']]
    for _, row in df_gares.iterrows()
]

HeatMap(
    heat_data,
    name='🌡️ Carte de chaleur',
    show=True,
    min_opacity=0.25,
    radius=30,
    blur=20,
    max_zoom=10,
    gradient={
        0.2: '#4FC3F7',   # bleu ciel doux
        0.4: '#81C784',   # vert doux
        0.65: '#FFF176',  # jaune pastel
        0.85: '#FFB74D',  # orange doux
        1.0:  '#EF5350',  # rouge doux
    }
).add_to(m)

# ── Marqueurs Gares — popup UNIQUEMENT au clic ───────────────
def couleur_gare(score):
    if score >= 8: return '#EF5350'
    if score >= 6: return '#66BB6A'
    if score >= 4: return '#FFA726'
    if score >= 2: return '#42A5F5'
    return '#B0BEC5'

def taille_gare(score):
    return max(6, min(20, int(score * 2.0)))

groupe_gares = folium.FeatureGroup(name='🚉 Gares (marqueurs)', show=True)

for _, row in df_gares.iterrows():
    couleur = couleur_gare(row['score_attractivite'])
    taille  = taille_gare(row['score_attractivite'])

    popup_html = f"""
    <div style="font-family:Segoe UI,sans-serif;min-width:210px;
                background:#1a1a2e;color:white;padding:14px;border-radius:10px;
                border-left:4px solid {couleur};">
        <h4 style="color:{couleur};margin:0 0 10px 0;">🚉 {row['nom_gare'].title()}</h4>
        <table style="font-size:12px;width:100%;border-collapse:collapse;">
            <tr><td style="color:#aaa;padding:3px 6px;">📍 Commune</td><td><b>{row['commune']}</b></td></tr>
            <tr><td style="color:#aaa;padding:3px 6px;">🗺️ Département</td><td><b>{row['departement']}</b></td></tr>
            <tr><td style="color:#aaa;padding:3px 6px;">⭐ Score</td><td><b style="color:{couleur}">{row['score_attractivite']:.1f} / 10</b></td></tr>
            <tr><td style="color:#aaa;padding:3px 6px;">🏛️ POI à 5km</td><td><b>{int(row['nb_poi_5km'])}</b></td></tr>
            <tr><td style="color:#aaa;padding:3px 6px;">🎯 Profil</td><td><b>{row['profil_touristique']}</b></td></tr>
            <tr><td style="color:#aaa;padding:3px 6px;">👥 Voyageurs/an</td><td><b>{int(row['nb_voyageurs_annuel']):,}</b></td></tr>
        </table>
    </div>
    """

    folium.CircleMarker(
        location=[row['latitude'], row['longitude']],
        radius=taille,
        color='white',
        weight=1.2,
        fill=True,
        fill_color=couleur,
        fill_opacity=0.85,
        tooltip=f"🚉 {row['nom_gare'].title()} — {row['score_attractivite']:.1f}/10",
        popup=folium.Popup(popup_html, max_width=270)
    ).add_to(groupe_gares)

groupe_gares.add_to(m)

# ── Légende collapsible ──────────────────────────────────────
legende_html = """
<div id="legende-container" style="
    position:fixed; bottom:30px; left:30px; z-index:9999;
    font-family:Segoe UI,sans-serif; font-size:13px;">

    <!-- Bouton toggle -->
    <button onclick="
        var c = document.getElementById('legende-corps');
        var b = document.getElementById('legende-btn');
        if(c.style.display==='none'){c.style.display='block';b.innerText='▼ Légende';}
        else{c.style.display='none';b.innerText='▶ Légende';}
    " id="legende-btn"
    style="background:rgba(20,20,40,0.9);color:#4FC3F7;border:1px solid rgba(79,195,247,0.4);
           padding:6px 14px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:bold;
           box-shadow:0 2px 10px rgba(0,0,0,0.4);">▼ Légende</button>

    <!-- Corps de la légende -->
    <div id="legende-corps" style="
        margin-top:6px;
        background:rgba(20,20,40,0.88); padding:14px 18px; border-radius:12px;
        box-shadow:0 4px 20px rgba(0,0,0,0.4); min-width:220px;
        border:1px solid rgba(255,255,255,0.1);">
        <b style="color:#4FC3F7;font-size:13px;">⭐ Score Attractivité</b><br><br>
        <span style="color:#EF5350;font-size:15px;">●</span>&nbsp;<span style="color:white;">Destination Premium (&ge;8)</span><br>
        <span style="color:#66BB6A;font-size:15px;">●</span>&nbsp;<span style="color:white;">Forte attractivité (&ge;6)</span><br>
        <span style="color:#FFA726;font-size:15px;">●</span>&nbsp;<span style="color:white;">Attractivité modérée (&ge;4)</span><br>
        <span style="color:#42A5F5;font-size:15px;">●</span>&nbsp;<span style="color:white;">Faible attractivité (&ge;2)</span><br>
        <span style="color:#B0BEC5;font-size:15px;">●</span>&nbsp;<span style="color:white;">À développer</span><br>
        <br><i style="color:#555;font-size:11px;">Clic sur un cercle → détails complets</i>
    </div>
</div>
"""
m.get_root().html.add_child(folium.Element(legende_html))

# ── Contrôle couches (collapsed au clic) ────────────────────
folium.LayerControl(position='topright', collapsed=True).add_to(m)

# ── Sauvegarde ───────────────────────────────────────────────
output = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "carte_interactive.html"))
m.save(output)

print(f"\n🗺️  Carte sauvegardée !")
print(f"📂  {output}")
print(f"\n🌐  Ouverture dans le navigateur...")
webbrowser.open(f'file:///{output}')
print("✅ Done !")
