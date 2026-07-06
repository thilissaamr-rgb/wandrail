// TGV Duplex sur la LGV Méditerranée — Alaric Favier, CC BY-SA 3.0.
export const HERO_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/TGV_Duplex_274_%28LGV_M%C3%A9diterran%C3%A9e%2C_Bouches-du-Rh%C3%B4ne%2C_France%29.jpg/1280px-TGV_Duplex_274_%28LGV_M%C3%A9diterran%C3%A9e%2C_Bouches-du-Rh%C3%B4ne%2C_France%29.jpg'

// Trois panoramas ferroviaires pour le carrousel du Hero (Wikimedia + Unsplash).
// Chaque photo montre un train dans un paysage remarquable, comme demande.
export const HERO_CAROUSEL = [
  // TGV Duplex sur la LGV Mediterranee
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/TGV_Duplex_274_%28LGV_M%C3%A9diterran%C3%A9e%2C_Bouches-du-Rh%C3%B4ne%2C_France%29.jpg/1280px-TGV_Duplex_274_%28LGV_M%C3%A9diterran%C3%A9e%2C_Bouches-du-Rh%C3%B4ne%2C_France%29.jpg',
  // Viaduc de Garabit (train sur pont de pierre / paysage francais)
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Viaduc_de_Garabit_-_2015-08-14.jpg/1280px-Viaduc_de_Garabit_-_2015-08-14.jpg',
  // Train de la Rhune / paysage montagne
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Train_de_La_Rhune_%28Pyr%C3%A9n%C3%A9es-Atlantiques%29.jpg/1280px-Train_de_La_Rhune_%28Pyr%C3%A9n%C3%A9es-Atlantiques%29.jpg',
]

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
