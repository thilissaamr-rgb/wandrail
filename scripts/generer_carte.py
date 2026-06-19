"""
Génère la carte des gares PDL en PNG — à insérer dans Power BI comme image
"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import pandas as pd
from sqlalchemy import create_engine

# ── Connexion ────────────────────────────────────────────────
engine = create_engine("postgresql://postgres:00000@localhost:5434/tourisme_train")

df = pd.read_sql("""
    SELECT nom_gare, commune, departement, latitude, longitude,
           score_attractivite, profil_touristique, nb_poi_5km, nb_categories
    FROM gold.dim_gare
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
""", engine)

print(f"✅ {len(df)} gares chargées")

# ── Palette couleurs ─────────────────────────────────────────
def get_color(score):
    if score >= 8:  return '#E74C3C'   # Premium   — rouge
    if score >= 6:  return '#1E8449'   # Fort      — vert
    if score >= 4:  return '#F39C12'   # Modéré    — orange
    if score >= 2:  return '#3498DB'   # Faible    — bleu
    return '#95A5A6'                   # À dév.    — gris

df['color'] = df['score_attractivite'].apply(get_color)
df['size']  = df['score_attractivite'] * 80 + 20

# ── Figure ───────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(14, 12), dpi=150)
fig.patch.set_facecolor('#EBF5FB')
ax.set_facecolor('#D6EAF8')

# Scatter principal
sc = ax.scatter(
    df['longitude'], df['latitude'],
    s=df['size'], c=df['color'],
    alpha=0.80, edgecolors='white', linewidths=0.7, zorder=3
)

# Labels Top 20
top20 = df.nlargest(20, 'score_attractivite')
for _, row in top20.iterrows():
    ax.annotate(
        row['nom_gare'].title(),
        (row['longitude'], row['latitude']),
        fontsize=6.5, ha='center', va='bottom',
        xytext=(0, 7), textcoords='offset points',
        fontweight='bold', color='#1A2B3C',
        bbox=dict(boxstyle='round,pad=0.1', facecolor='white',
                  alpha=0.7, edgecolor='none')
    )

# Quadrillage
ax.grid(True, color='white', alpha=0.5, linewidth=0.5, linestyle='--')
ax.set_axisbelow(True)

# Axes
ax.set_xlabel('Longitude', color='#6B7280', fontsize=10)
ax.set_ylabel('Latitude',  color='#6B7280', fontsize=10)
ax.tick_params(colors='#95A5A6', labelsize=8)
for spine in ax.spines.values():
    spine.set_edgecolor('#B0C4DE')

# Titre
ax.set_title(
    '📍 Gares Pays de la Loire — Score d\'Attractivité Touristique',
    fontsize=15, fontweight='bold', color='#1A2B3C', pad=20
)

# Légende
legend_items = [
    mpatches.Patch(color='#E74C3C', label='🌟 Destination Premium (≥8)'),
    mpatches.Patch(color='#1E8449', label='🟢 Forte attractivité (≥6)'),
    mpatches.Patch(color='#F39C12', label='🟡 Attractivité modérée (≥4)'),
    mpatches.Patch(color='#3498DB', label='🔵 Faible attractivité (≥2)'),
    mpatches.Patch(color='#95A5A6', label='⚪ À développer'),
]
ax.legend(handles=legend_items, loc='lower right', fontsize=9,
          framealpha=0.92, facecolor='white', edgecolor='#B0C4DE',
          title='Score Attractivité', title_fontsize=9)

# Annotation bas
ax.text(0.01, 0.01,
    f'Pays de la Loire · {len(df)} gares · Source : SNCF Open Data + DATAtourisme',
    transform=ax.transAxes, fontsize=7, color='#95A5A6', style='italic')

# Taille des bulles — mini légende
for score, label in [(2,'Score 2'),(5,'Score 5'),(8,'Score 8')]:
    ax.scatter([], [], s=score*80+20, c='#1B6CA8', alpha=0.7,
               label=label, edgecolors='white')

plt.tight_layout(pad=2)

# ── Sauvegarde ───────────────────────────────────────────────
output = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "carte_gares_pdl.png"))
plt.savefig(output, dpi=150, bbox_inches='tight',
            facecolor='#EBF5FB', edgecolor='none')
plt.close()

print(f"🗺️  Carte sauvegardée : {output}")
print("✅ Insère cette image dans Power BI : Insertion → Image → carte_gares_pdl.png")
