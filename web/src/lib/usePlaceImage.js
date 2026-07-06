import { useEffect, useState } from 'react'
import { wikipediaPlace } from './format'

// Recupere une vraie photo de la ville depuis Wikipedia (resume REST).
// Repli sur l'image fournie (picsum) si aucune photo n'est trouvee.
// Cache module pour ne jamais refaire deux fois la meme requete.

const cache = new Map() // commune (minuscule) -> url | null | Promise

function fetchPlaceImage(commune) {
  const key = String(commune || '').toLowerCase().trim()
  if (!key) return Promise.resolve(null)
  if (cache.has(key)) return Promise.resolve(cache.get(key))

  const p = fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikipediaPlace(key))}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      // On prefere l'image originale (toujours servie, bonne qualite) tant
      // qu'elle reste raisonnable ; sinon la vignette. Les tailles
      // intermediaires generees a la volee par Wikimedia sont peu fiables.
      const orig = d && d.originalimage
      const thumb = d && d.thumbnail
      let url = null
      if (orig && orig.source && (orig.width || 0) <= 2600) url = orig.source
      else if (thumb && thumb.source) url = thumb.source.replace(/\/\d+px-/, '/1280px-')
      else if (orig && orig.source) url = orig.source
      cache.set(key, url)
      return url
    })
    .catch(() => {
      cache.set(key, null)
      return null
    })

  cache.set(key, p) // memorise la promesse pour dedupliquer les appels simultanes
  return p
}

// Liste des grandes villes francaises qu on peut extraire d un nom de gare
// (ex: "Lyon Saint-Paul" -> "Lyon", "Paris-Gare-de-Lyon" -> "Paris")
const KNOWN_CITIES = [
  'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg',
  'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Grenoble',
  'Dijon', 'Angers', 'Nimes', 'Nîmes', 'Le Mans', 'Aix', 'Brest', 'Tours',
  'Limoges', 'Clermont', 'Amiens', 'Orleans', 'Orléans', 'Metz', 'Nancy',
  'Perpignan', 'Rouen', 'Caen', 'Mulhouse', 'Besançon', 'Besancon',
]

// Retourne une ville "de secours" a essayer si la commune initiale echoue
// (utile pour les gares dont le nom n est pas une ville, ex "Saint-Michel
// Notre-Dame" -> "Paris" via le departement).
export function extractFallbackCity(nomGare, departement) {
  const low = String(nomGare || '').toLowerCase()
  for (const city of KNOWN_CITIES) {
    if (low.includes(city.toLowerCase())) return city
  }
  const dep = String(departement || '').trim()
  // Si le departement est directement le nom d une ville (Paris = 75)
  if (KNOWN_CITIES.includes(dep)) return dep
  return null
}

export function usePlaceImage(commune, fallback) {
  const [url, setUrl] = useState(fallback)
  useEffect(() => {
    let cancelled = false
    setUrl(fallback)
    fetchPlaceImage(commune).then((u) => {
      if (!cancelled && u) setUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [commune, fallback])
  return url
}

// Recupere jusqu'a 3 images differentes pour une commune :
// 1. Image de l'article Wikipedia FR
// 2-3. Images de la meme page (via l'API MediaWiki "pageimages")
// Cache module pour ne pas refaire deux fois.
const multiCache = new Map()

async function fetchPlaceGallery(commune) {
  const key = String(commune || '').toLowerCase().trim()
  if (!key) return []
  if (multiCache.has(key)) {
    const hit = multiCache.get(key)
    return hit instanceof Promise ? await hit : hit
  }
  const title = wikipediaPlace(key)
  const p = (async () => {
    // 1. photo principale
    const main = await fetchPlaceImage(commune)
    const gallery = main ? [main] : []
    // 2. autres images de la page via l'API images
    try {
      const url = `https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=images&imlimit=15&titles=${encodeURIComponent(title)}`
      const r = await fetch(url)
      const j = await r.json()
      const page = Object.values(j?.query?.pages || {})[0]
      // Filtre agressif : Wikipedia embarque enormement de cartes IGN/INSEE
      // dans les articles communes (Occupation des sols, Hydrographie,
      // Orthophoto, geologie...) qui ne sont PAS des photos.
      // On garde uniquement les vraies photos.
      const EXCLUDE = [
        'commons-logo', 'icon', 'logo', 'flag', 'blason',
        'carte', 'map', 'plan_de_', 'schema', 'graphique', 'diagram',
        'orthophoto', 'ombrage', 'shaded', 'relief',
        'coat_of_arms', 'wappen', 'gerb',
        // INSEE / geologie France : -Sols, -Hydro, -argile, -Orthophoto
        '-sols.', '-hydro.', '-orthophoto.', '-argile.', '-geologie',
        'occupation_des_sols', 'usage_des_sols',
      ]
      const startsWithInseeCode = (t) => /^File:\d{5}[-_]/i.test(t) || /^Fichier:\d{5}[-_]/i.test(t)
      const files = (page?.images || [])
        .map((im) => im.title)
        .filter((t) => /\.(jpe?g|png|webp)$/i.test(t))
        .filter((t) => {
          const low = t.toLowerCase()
          if (EXCLUDE.some((k) => low.includes(k))) return false
          if (startsWithInseeCode(t)) return false
          return true
        })
        .slice(0, 5)
      const URL_EXCLUDE = /(sols\.|hydro\.|orthophoto|argile|geologie|carte|blason|ombrage|shaded|relief|occupation.des.sols)/i
      for (const file of files) {
        if (gallery.length >= 3) break
        try {
          const info = await fetch(
            `https://fr.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=1280&titles=${encodeURIComponent(file)}`
          ).then((r) => r.json())
          const infoPage = Object.values(info?.query?.pages || {})[0]
          const src = infoPage?.imageinfo?.[0]?.thumburl || infoPage?.imageinfo?.[0]?.url
          // Deuxieme filtre sur l URL finale : Wikipedia peut renommer le fichier
          if (src && !URL_EXCLUDE.test(src) && !gallery.includes(src)) gallery.push(src)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
    const result = gallery.slice(0, 3)
    multiCache.set(key, result)
    return result
  })()
  multiCache.set(key, p)
  return await p
}

export function usePlaceGallery(commune, fallbackCommune) {
  const [images, setImages] = useState([])
  useEffect(() => {
    let cancelled = false
    setImages([])
    fetchPlaceGallery(commune).then(async (imgs) => {
      if (cancelled) return
      if (imgs.length > 0) {
        setImages(imgs)
        return
      }
      // Repli : si la commune initiale ne donne rien (gare avec nom exotique),
      // essayer la ville extraite ou le departement.
      if (fallbackCommune && fallbackCommune !== commune) {
        const fbImgs = await fetchPlaceGallery(fallbackCommune)
        if (!cancelled) setImages(fbImgs)
      }
    })
    return () => {
      cancelled = true
    }
  }, [commune, fallbackCommune])
  return images
}
