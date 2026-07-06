// Photos de fallback par categorie de POI.
// Utilise quand image_url DATAtourisme est absente (dump SQL sans bronze).
// Chaque URL est verifiee comme accessible (Wikimedia Commons 1280px-).
// Selection par hash du nom -> stable entre chargements, varie entre POI.

const CATEGORY_IMAGES = {
  Hebergement: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Hotel_bedroom_MS_Nordkapp.jpg/1280px-Hotel_bedroom_MS_Nordkapp.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/H%C3%B4tel_Vend%C3%B4me_(interior).jpg/1280px-H%C3%B4tel_Vend%C3%B4me_(interior).jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Maison_normande_%C3%A0_colombages.jpg/1280px-Maison_normande_%C3%A0_colombages.jpg',
  ],
  Restauration: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Steack-frites.jpg/1280px-Steack-frites.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Brasserie_Lipp_-_Paris_-_2020.jpg/1280px-Brasserie_Lipp_-_Paris_-_2020.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Boulangerie_Paris.jpg/1280px-Boulangerie_Paris.jpg',
  ],
  Culture: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Louvre_Museum_Wikimedia_Commons.jpg/1280px-Louvre_Museum_Wikimedia_Commons.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Cathedrale_de_Reims_-_Fa%C3%A7ade_ouest.jpg/1280px-Cathedrale_de_Reims_-_Fa%C3%A7ade_ouest.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Chateau_de_Chenonceau_2008E.jpg/1280px-Chateau_de_Chenonceau_2008E.jpg',
  ],
  Nature: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Etretat_-_the_cliffs_-_2.jpg/1280px-Etretat_-_the_cliffs_-_2.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Rochers_en_for%C3%AAt_de_Fontainebleau11.JPG/1280px-Rochers_en_for%C3%AAt_de_Fontainebleau11.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Parc_national_des_Calanques_-_Sormiou.jpg/1280px-Parc_national_des_Calanques_-_Sormiou.jpg',
  ],
  Sport: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Cyclisme_route_France.jpg/1280px-Cyclisme_route_France.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Randonn%C3%A9e_en_montagne.jpg/1280px-Randonn%C3%A9e_en_montagne.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/C%C3%B4te_de_granit_rose_-_Ploumanach.jpg/1280px-C%C3%B4te_de_granit_rose_-_Ploumanach.jpg',
  ],
  Loisir: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Parc_de_la_T%C3%AAte_d%27or_-_Lyon.jpg/1280px-Parc_de_la_T%C3%AAte_d%27or_-_Lyon.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Coucher_de_soleil_sur_le_pont_de_pierre_de_Bordeaux.jpg/1280px-Coucher_de_soleil_sur_le_pont_de_pierre_de_Bordeaux.jpg',
  ],
}

function hashString(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

// Retourne une URL de photo pour un POI en fonction de sa categorie
// et de son nom. Meme nom -> meme photo (stable). Si aucune photo
// n'existe pour la categorie, on tombe sur "Culture" (large fallback).
export function poiFallbackImage(categorie, nom) {
  const pool = CATEGORY_IMAGES[categorie] || CATEGORY_IMAGES.Culture
  const idx = hashString(nom) % pool.length
  return pool[idx]
}
