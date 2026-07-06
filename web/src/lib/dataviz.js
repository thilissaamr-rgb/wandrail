// Palette dataviz coherente pour la partie Analyste.
// Chaque couleur porte un sens semantique — la choisir en fonction du domaine
// des donnees, pas de l esthetique.

export const DATAVIZ = {
  // Semantiques par domaine
  eco: '#0A5C36',        // Vert Wandrail — impact positif, bas carbone
  ecoLight: '#22C55E',   // Vert clair — variation, secondaire
  carbon: '#E76F51',     // Rouge orange — CO2, voiture, alerte
  train: '#1F6FEB',      // Bleu — train, mobilite
  gold: '#F59E0B',       // Ambre — potentiel, opportunite
  neutral: '#64748B',    // Gris slate — reference, moyenne
  purple: '#8B5CF6',     // Violet — ML, algorithme
  pink: '#EC4899',       // Rose — profil, humain
}

// Palette categorielle pour les graphes multi-series
// (KMeans clusters, categories POI, profils voyageur, etc.)
export const CATEGORIES = [
  '#0A5C36', // Vert eco
  '#1F6FEB', // Bleu train
  '#F59E0B', // Ambre
  '#8B5CF6', // Violet ML
  '#EC4899', // Rose
  '#14B8A6', // Cyan-teal
  '#EF4444', // Rouge
  '#A855F7', // Purple 2
  '#F97316', // Orange
  '#84CC16', // Lime
  '#06B6D4', // Cyan
  '#F472B6', // Rose light
  '#6366F1', // Indigo
  '#10B981', // Green light
]

// Retourne la couleur categorielle a l index i (cycle).
export function catColor(i) {
  return CATEGORIES[i % CATEGORIES.length]
}

// Style commun pour tous les composants Recharts.
// A passer dans <CartesianGrid stroke={GRID_COLOR}>, etc.
export const GRID_COLOR = 'rgba(148, 163, 184, 0.15)'
export const AXIS_COLOR = 'rgb(100 116 139)'
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgb(var(--card))',
    border: '1px solid var(--line)',
    borderRadius: 12,
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  },
  labelStyle: { color: 'rgb(var(--text))', fontWeight: 700 },
  itemStyle: { color: 'rgb(var(--text))' },
  cursor: { fill: 'rgba(148, 163, 184, 0.1)' },
}
