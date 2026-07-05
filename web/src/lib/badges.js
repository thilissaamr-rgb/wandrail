// Systeme de badges et grades Wandrail.
// Base sur les vraies actions de l'utilisateur : trajets, CO2 evite, favoris, villes.

// ─── Badges : tous les badges possibles, unlockes selon les stats ────
export const ALL_BADGES = [
  // Trajets
  {
    id: 'first_trip',
    icon: 'train',
    color: '#0A5C36',
    name: 'Premier trajet',
    desc: 'Premier voyage enregistré',
    check: (s) => s.nb_trajets >= 1,
  },
  {
    id: 'ten_trips',
    icon: 'train',
    color: '#0A5C36',
    name: 'Explorateur',
    desc: '10 trajets réalisés',
    check: (s) => s.nb_trajets >= 10,
  },
  {
    id: 'fifty_trips',
    icon: 'train',
    color: '#F59E0B',
    name: 'Habitué du rail',
    desc: '50 trajets réalisés',
    check: (s) => s.nb_trajets >= 50,
  },

  // CO2 evite
  {
    id: 'first_co2',
    icon: 'leaf',
    color: '#22C55E',
    name: 'Premier pas vert',
    desc: '10 kg de CO₂ évités',
    check: (s) => s.co2_evite_kg >= 10,
  },
  {
    id: 'hundred_co2',
    icon: 'leaf',
    color: '#22C55E',
    name: 'Éco-voyageur',
    desc: '100 kg de CO₂ évités',
    check: (s) => s.co2_evite_kg >= 100,
  },
  {
    id: 'thousand_co2',
    icon: 'leaf',
    color: '#0A5C36',
    name: 'Champion climat',
    desc: '1 tonne de CO₂ évitée',
    check: (s) => s.co2_evite_kg >= 1000,
  },

  // Villes decouvertes
  {
    id: 'five_villes',
    icon: 'pin',
    color: '#E76F51',
    name: 'Curieux',
    desc: '5 villes différentes explorées',
    check: (s) => s.villes_visitees >= 5,
  },
  {
    id: 'twenty_villes',
    icon: 'pin',
    color: '#E76F51',
    name: 'Globe-trotter du rail',
    desc: '20 villes différentes explorées',
    check: (s) => s.villes_visitees >= 20,
  },

  // Favoris (engagement)
  {
    id: 'five_favs',
    icon: 'heart',
    color: '#EF4444',
    name: 'Coup de cœur',
    desc: '5 destinations en favoris',
    check: (s) => s.nb_favoris >= 5,
  },
  {
    id: 'twenty_favs',
    icon: 'heart',
    color: '#EF4444',
    name: 'Collectionneur',
    desc: '20 destinations en favoris',
    check: (s) => s.nb_favoris >= 20,
  },
]

// ─── Grades : niveaux progressifs bases sur le CO2 evite ────
export const GRADES = [
  { id: 'debutant', name: 'Débutant', min: 0, color: '#94A3B8', icon: 'train' },
  { id: 'explorateur', name: 'Explorateur vert', min: 50, color: '#0A5C36', icon: 'leaf' },
  { id: 'ambassadeur', name: 'Ambassadeur du rail', min: 300, color: '#1F6FEB', icon: 'star' },
  { id: 'expert', name: 'Expert bas carbone', min: 1000, color: '#F59E0B', icon: 'star' },
  { id: 'legende', name: 'Légende du train', min: 5000, color: '#8B5CF6', icon: 'star' },
]

// Renvoie {current, next, progressPct} — grade actuel + suivant + % vers suivant
export function computeGrade(co2EviteKg = 0) {
  const co2 = Number(co2EviteKg) || 0
  let current = GRADES[0]
  let next = GRADES[1]
  for (let i = 0; i < GRADES.length; i++) {
    if (co2 >= GRADES[i].min) {
      current = GRADES[i]
      next = GRADES[i + 1] || null
    }
  }
  const progressPct = next
    ? Math.round(((co2 - current.min) / (next.min - current.min)) * 100)
    : 100
  const remaining = next ? next.min - co2 : 0
  return { current, next, progressPct, remaining }
}

// Renvoie la liste des badges gagnes vs verrouilles
export function computeBadges(stats = {}) {
  const s = {
    nb_trajets: stats.nb_trajets || 0,
    co2_evite_kg: stats.co2_evite_kg || 0,
    villes_visitees: stats.villes_visitees || 0,
    nb_favoris: stats.nb_favoris || 0,
  }
  return ALL_BADGES.map((b) => ({ ...b, unlocked: b.check(s) }))
}
