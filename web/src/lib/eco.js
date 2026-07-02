// EcoScore : indice composite (0-100) mesurant l'interet d'une destination
// en train, du point de vue ecologique et touristique.
//
// Formule (documentee pour le memoire) :
//   EcoScore = 100 * ( 0.45 * benefice_CO2
//                    + 0.30 * attractivite
//                    + 0.25 * richesse )
// ou chaque composante est normalisee entre 0 et 1 :
//   - benefice_CO2 : CO2 economise vs voiture (aller-retour depuis le hub),
//     normalise a 80 kg. Recompense le fait de prendre le train plutot que
//     la voiture, surtout quand l'alternative routiere serait tres emettrice.
//   - attractivite : score d'attractivite de la gare (silver/gold) / 10.
//   - richesse     : nombre de lieux a 5 km, normalise a 500.

const HUB = { lat: 47.218371, lon: -1.541362 } // Nantes, hub regional
const CAR_G_PER_KM = 218 // gCO2/km (voiture, ADEME)
const TRAIN_RATIO = 0.09 // le train emet ~91% de CO2 en moins

function haversineKm(a, b) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function ecoScore(dest) {
  const lat = Number(dest.latitude)
  const lon = Number(dest.longitude)
  const distKm = lat && lon ? haversineKm([HUB.lat, HUB.lon], [lat, lon]) : 0
  const distAR = distKm * 2
  const co2Saved = (CAR_G_PER_KM * (1 - TRAIN_RATIO) * distAR) / 1000 // kg

  const cCo2 = Math.min(co2Saved / 80, 1)
  const cAttract = Math.min((Number(dest.score_attractivite) || 0) / 10, 1)
  const cRichesse = Math.min((Number(dest.nb_poi_5km) || 0) / 500, 1)

  const score = Math.round(100 * (0.45 * cCo2 + 0.3 * cAttract + 0.25 * cRichesse))

  return {
    score,
    co2Saved,
    distKm,
    components: [
      { key: 'CO2 evite', value: cCo2, weight: 45, detail: `${Math.round(co2Saved)} kg` },
      { key: 'Attractivite', value: cAttract, weight: 30, detail: `${(Number(dest.score_attractivite) || 0).toFixed(1)}/10` },
      { key: 'Activites', value: cRichesse, weight: 25, detail: `${dest.nb_poi_5km || 0} lieux` },
    ],
  }
}

// Couleur selon le niveau (vert = tres eco/attractif).
export function ecoColor(score) {
  if (score >= 70) return '#16a34a'
  if (score >= 45) return '#65a30d'
  if (score >= 25) return '#ca8a04'
  return '#9ca3af'
}

export function ecoLabel(score) {
  if (score >= 70) return 'Excellent'
  if (score >= 45) return 'Tres bon'
  if (score >= 25) return 'Bon'
  return 'Correct'
}
