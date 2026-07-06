// Photos de fallback pour cards POI.
// Strategie : quand aucune image_url DATAtourisme n est disponible, on
// pioche dans la galerie de la commune (photos Wikipedia deja fetchees
// pour le hero + carrousel destinations). Meme POI -> meme photo (stable
// par hash), varie entre POI d une meme commune.

function hashString(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

// Retourne une URL de photo contextuelle pour le POI.
// - Priorite 1 : image_url DATAtourisme si dispo
// - Priorite 2 : photo de la commune (galerie Wikipedia, deja chargee)
// - Fallback : null (la card affiche juste l icone categorie)
export function poiFallbackImage(gallery, nom) {
  if (!Array.isArray(gallery) || gallery.length === 0) return null
  const idx = hashString(nom) % gallery.length
  return gallery[idx]
}
