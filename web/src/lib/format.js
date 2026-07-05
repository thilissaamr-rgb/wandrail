const LOWER_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'et', 'aux', 'au'])

// Nettoie les noms de POI moches venus de DATAtourisme via un scraper Python.
// Ex: "['Le Point Bar']" -> "Le Point Bar". Retire aussi les guillemets doubles
// resiudels et les espaces multiples.
export function cleanPoiName(value) {
  let text = String(value || '').trim()
  // Cas "[...]" avec guillemets simples ou doubles issus de repr() Python
  const m = text.match(/^\[\s*['"](.+)['"]\s*\]$/s)
  if (m) text = m[1]
  // Guillemets de bord isoles
  text = text.replace(/^['"]|['"]$/g, '')
  return text.replace(/\s{2,}/g, ' ').trim()
}

export function formatPlaceName(value) {
  const words = String(value || '').toLocaleLowerCase('fr-FR').split(/([\s-]+)/)
  let wordIndex = 0
  return words.map((part) => {
    if (/^[\s-]+$/.test(part)) return part
    const keepLower = wordIndex > 0 && LOWER_WORDS.has(part)
    wordIndex += 1
    return keepLower ? part : part.charAt(0).toLocaleUpperCase('fr-FR') + part.slice(1)
  }).join('')
}

export function wikipediaPlace(value) {
  return formatPlaceName(
    String(value || '')
      .replace(/\b(Saint-Charles|Centre|Ville|TGV|TER|Challes-les-Eaux)\b/gi, '')
      .replace(/\s+-\s+.*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  )
}
