const LOWER_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'sur', 'sous', 'en', 'et', 'aux', 'au'])

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
