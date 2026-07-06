// Hero : 4 panoramas ferroviaires sur CDN externes.
// Choisies par l utilisatrice pour l effet "wow" en soutenance.
export const HERO_CAROUSEL = [
  'https://images.partir.com/GYiIZtAtrFwJfOolUY_LwFNXl6M=/750x/filters:sharpen(0.3,0.3,true)/train/voyages-trains-insolites-bernina-express-3.jpg',
  'https://www.groupevoyagesvp.ca/wp-content/uploads/2020/02/train-3396952_1280.jpg',
  'https://www.abcdtrains.com/wp-content/uploads/2025/05/train-panoramique.jpg',
  'https://static.cnews.fr/sites/default/files/styles/image_750_422/public/web_suisse_sts9980_5d72742700005.jpg?itok=o8NQEiHF',
]

export const HERO_IMAGE = HERO_CAROUSEL[0]

// Themes d'inspiration : chaque theme pointe vers un lieu iconique reel
// dont l'image est chargee dynamiquement via l'API Wikipedia (usePlaceImage).
// C'est plus fiable que des URLs Commons codees en dur (qui peuvent renvoyer 400).
export const INSPIRATION_PLACES = {
  nature: 'Forêt de Fontainebleau',
  mer: 'Étretat',
  patrimoine: 'Château de Chenonceau',
  gastronomie: 'Lyon',
  romantique: 'Bordeaux',
  famille: 'Nantes',
}

const DEST_IMG = {
  saumur: 40,
  'le mans': 175,
  angers: 192,
  nantes: 130,
  'saint-nazaire': 116,
  'st-nazaire': 116,
  'la baule': 169,
  'le pouliguen': 76,
  laval: 181,
  'le croisic': 74,
  cholet: 583,
  pornic: 76,
  'les sables': 169,
  'la roche-sur-yon': 103,
  clisson: 40,
  'fontenay-le-comte': 826,
}

const FALLBACK_IDS = [
  175, 100, 103, 192, 181, 130, 116, 169, 76, 74, 583, 248, 379, 431, 592, 826,
]

function hashString(str) {
  let sum = 0
  for (let i = 0; i < str.length; i += 1) sum += str.charCodeAt(i)
  return sum
}

export function poiImage(categorie, nom, w = 600, h = 360) {
  const seed =
    `${categorie || 'lieu'}-${nom || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 28) || 'lieu'
  return `https://picsum.photos/seed/${seed}/${w}/${h}`
}

export function destImage(nom, w = 800, h = 500) {
  const key = String(nom || '').toLowerCase()
  let id = null
  for (const [label, value] of Object.entries(DEST_IMG)) {
    if (key.includes(label)) {
      id = value
      break
    }
  }
  if (id == null) {
    id = FALLBACK_IDS[hashString(key) % FALLBACK_IDS.length]
  }
  return `https://picsum.photos/id/${id}/${w}/${h}`
}
