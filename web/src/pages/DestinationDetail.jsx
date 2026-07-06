import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { api } from '../lib/api'
import { destImage } from '../lib/images'
import { poiFallbackImage } from '../lib/poiImages'
import { usePlaceImage, usePlaceGallery } from '../lib/usePlaceImage'
import { useTheme } from '../lib/theme.jsx'
import { generateTravelSummary } from '../lib/ticket'
import { ecoScore, ecoColor, ecoLabel } from '../lib/eco'
import Icon, { iconSvg } from '../components/Icon'
import { MobiliteCards, MobiliteList } from '../components/MobiliteCards'
import { cleanPoiName, formatPlaceName } from '../lib/format'

// Scenario de reference explicite pour la comparaison nationale train / voiture.
const HUB = { nom: 'Paris', lat: 48.8566, lon: 2.3522 }
const CAR_G_PER_KM = 218 // gCO2/km (voiture, ADEME)
const TRAIN_RATIO = 0.09 // le train emet ~91% de CO2 en moins

// Corrige les icones Leaflet (chemins casses par le bundler Vite).
const icon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const POI_ICON = {
  Restauration: 'wine',
  Hebergement: 'hotel',
  Culture: 'culture',
  Patrimoine: 'castle',
  Nature: 'leaf',
  Loisirs: 'activity',
  Evenement: 'event',
}

const poiMapIcon = (category) => L.divIcon({
  className: 'wandrail-map-icon',
  html: `<div class="wandrail-poi-marker">${iconSvg(POI_ICON[category] || 'pin', 17)}</div>`,
  iconSize: [34, 38],
  iconAnchor: [17, 36],
})

const cleanLabel = (value) => String(value || '')
  .replace(/^\s*\[\s*['"]?/, '')
  .replace(/['"]?\s*\]\s*$/, '')
  .replace(/^['"]|['"]$/g, '')
  .trim()
const cap = (value) => formatPlaceName(cleanLabel(value))
const WALK_MIN_PER_KM = 12 // marche a ~5 km/h

const weatherLabel = (code) => {
  if (code === 0) return 'Ciel dégagé'
  if ([1, 2, 3].includes(code)) return 'Éclaircies'
  if ([45, 48].includes(code)) return 'Brouillard'
  if (code >= 51 && code <= 67) return 'Pluie'
  if (code >= 71 && code <= 77) return 'Neige'
  if (code >= 80 && code <= 82) return 'Averses'
  if (code >= 95) return 'Orage'
  return 'Météo actuelle'
}

// Distance a vol d'oiseau (km) entre deux points [lat, lon].
function haversineKm(a, b) {
  if (!a || !b) return 0
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const storageKey = (nom) => `wandrail:itin:${nom}`

// Lien Google Maps "directions" a pied : gare -> etapes intermediaires -> derniere.
function gmapsDirectionsUrl(center, points) {
  const origin = `${center[0]},${center[1]}`
  const last = points[points.length - 1]
  const destination = `${last[0]},${last[1]}`
  const params = new URLSearchParams({ api: '1', origin, destination, travelmode: 'walking' })
  const wp = points
    .slice(0, -1)
    .map(([la, lo]) => `${la},${lo}`)
    .join('|')
  if (wp) params.set('waypoints', wp)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export default function DestinationDetail() {
  const { nom } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [cat, setCat] = useState('Tout')
  const [selected, setSelected] = useState([]) // noms de lieux selectionnes
  const [ticketBusy, setTicketBusy] = useState(false)
  const [weather, setWeather] = useState(null)
  const [schedules, setSchedules] = useState(null)
  const [mobilites, setMobilites] = useState(null)
  const [mobiliteTab, setMobiliteTab] = useState(null) // 'velo' | 'bus' | 'tram' | null
  // Galerie photos Wikipedia de la commune (partagee entre hero + POI cards)
  const communeGallery = usePlaceGallery(data?.destination?.commune || nom)

  // Chargement de la destination + restauration de l'itineraire sauvegarde.
  useEffect(() => {
    setData(null)
    setError(false)
    setCat('Tout')
    try {
      setSelected(JSON.parse(localStorage.getItem(storageKey(nom))) || [])
    } catch {
      setSelected([])
    }
    api.destination(nom).then(setData).catch(() => setError(true))
    // Horaires SNCF Navitia (endpoint indépendant : ne bloque pas la fiche)
    setSchedules(null)
    api.schedules(nom, 6).then(setSchedules).catch(() => setSchedules({ available: false, departures: [] }))
    // Mobilité locale (vélos / bus / tram / ferry autour de la gare)
    setMobilites(null)
    setMobiliteTab(null)
    api.mobilites(nom, 2).then(setMobilites).catch(() => setMobilites({ totaux: {} }))
  }, [nom])

  useEffect(() => {
    const destination = data?.destination
    if (!destination?.latitude || !destination?.longitude) {
      setWeather(null)
      return
    }
    let cancelled = false
    const params = new URLSearchParams({
      latitude: destination.latitude,
      longitude: destination.longitude,
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
      daily: 'temperature_2m_max,temperature_2m_min',
      forecast_days: '1',
      timezone: 'auto',
    })
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!cancelled) setWeather(result) })
      .catch(() => { if (!cancelled) setWeather(null) })
    return () => { cancelled = true }
  }, [data])

  // Met a jour la selection ET la persiste (par destination).
  const updateSelected = (updater) =>
    setSelected((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(storageKey(nom), JSON.stringify(next))
      } catch {
        /* quota / mode prive : on ignore */
      }
      return next
    })

  const toggle = (name) =>
    updateSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )

  const pois = data?.pois || []

  // Vraie photo de la ville (Wikipedia) avec repli picsum.
  const communeName = data?.destination?.commune || data?.destination?.nom_gare || ''
  // Photo Wikipedia UNIQUEMENT. Pas de repli Picsum aleatoire.
  const heroImg = usePlaceImage(communeName, null)
  const { dark } = useTheme()
  // Tiles style "Voyager" CartoDB : rendu proche de Google Maps
  // (routes marquees, labels contrastes, POI reperables) — plus lisible
  // que le style Light minimaliste. Dark mode : DarkMatter.
  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

  const cats = useMemo(
    () => ['Tout', ...new Set(pois.map((p) => p.categorie).filter(Boolean))],
    [pois],
  )

  const visible = useMemo(
    () => pois.filter((p) => cat === 'Tout' || p.categorie === cat).slice(0, 60),
    [pois, cat],
  )

  // Itineraire = lieux selectionnes, ordonnes par distance a la gare.
  const itinerary = useMemo(
    () =>
      pois
        .filter((p) => selected.includes(p.nom))
        .sort((a, b) => (a.distance_gare_km || 0) - (b.distance_gare_km || 0)),
    [selected, pois],
  )

  // Vrai trace pieton (suivant les rues) via OSRM, recalcule a chaque
  // changement d'itineraire. Repli sur la ligne directe si indisponible.
  const [routeGeo, setRouteGeo] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const routeKey = itinerary.map((p) => p.nom).join('|')

  useEffect(() => {
    if (!data || itinerary.length === 0) {
      setRouteGeo(null)
      setRouteInfo(null)
      return
    }
    const c = [data.destination.latitude, data.destination.longitude]
    const pts = itinerary
      .filter((p) => p.latitude && p.longitude)
      .map((p) => [p.latitude, p.longitude])
    if (pts.length === 0) {
      setRouteGeo(null)
      setRouteInfo(null)
      return
    }
    const coordStr = [c, ...pts].map(([la, lo]) => `${lo},${la}`).join(';')
    let cancelled = false
    fetch(`https://router.project-osrm.org/route/v1/foot/${coordStr}?overview=full&geometries=geojson`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const route = j.code === 'Ok' && j.routes && j.routes[0]
        if (route && route.geometry?.coordinates?.length > 1) {
          // On garde la distance routiere reelle, mais on recalcule le temps a
          // pied (le serveur de demo OSRM renvoie des durees de type voiture).
          const km = route.distance / 1000
          setRouteGeo(route.geometry.coordinates.map(([lo, la]) => [la, lo]))
          setRouteInfo({
            km,
            min: Math.round(km * WALK_MIN_PER_KM),
            legs: (route.legs || []).map((l) => {
              const legKm = l.distance / 1000
              return { km: legKm, min: Math.round(legKm * WALK_MIN_PER_KM) }
            }),
          })
        } else {
          setRouteGeo(null)
          setRouteInfo(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRouteGeo(null)
          setRouteInfo(null)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, data])

  if (error) {
    return (
      <div className="mx-auto max-w-page px-6 py-24 text-center text-muted">
        Destination introuvable.{' '}
        <Link to="/destinations" className="font-semibold text-violet">
          Retour
        </Link>
      </div>
    )
  }

  if (!data) {
    return <div className="mx-auto max-w-page px-6 py-24 text-center text-muted">Chargement...</div>
  }

  const d = data.destination
  const ville = cap(d.commune || d.nom_gare)
  const center = [d.latitude, d.longitude]
  const sncfUrl = `https://www.sncf-connect.com/app/home/search?destination=${encodeURIComponent(ville)}`

  // Calcul des troncons reels (gare -> etape 1 -> etape 2 -> ...).
  const legs = itinerary.map((p, idx) => {
    const from = idx === 0 ? center : [itinerary[idx - 1].latitude, itinerary[idx - 1].longitude]
    const to = [p.latitude, p.longitude]
    const km = p.latitude && p.longitude ? haversineKm(from, to) : 0
    return { km, min: Math.round(km * WALK_MIN_PER_KM) }
  })
  const totalKm = legs.reduce((s, l) => s + l.km, 0)
  const totalWalk = Math.round(totalKm * WALK_MIN_PER_KM)

  const itinPoints = itinerary
    .filter((p) => p.latitude && p.longitude)
    .map((p) => [p.latitude, p.longitude])
  const linePositions = [center, ...itinPoints]

  // Totaux affiches : vrai trace OSRM si dispo, sinon estimation a vol d'oiseau.
  const displayKm = routeInfo ? routeInfo.km : totalKm
  const displayMin = routeInfo ? routeInfo.min : totalWalk
  const useRealLegs = routeInfo && routeInfo.legs.length === itinerary.length
  const directionsUrl = itinPoints.length > 0 ? gmapsDirectionsUrl(center, itinPoints) : null

  // Comparaison indicative train vs voiture, aller-retour depuis le hub de Paris.
  const distKm = haversineKm([HUB.lat, HUB.lon], center)
  const distAR = distKm * 2
  const carCo2 = (CAR_G_PER_KM * distAR) / 1000 // kg
  const trainCo2 = carCo2 * TRAIN_RATIO
  const co2Saved = carCo2 - trainCo2
  const carTimeMin = Math.round((distAR / 75) * 60) // ~75 km/h porte a porte
  const trainTimeMin = Math.round((distAR / 80) * 60) // ~80 km/h moyenne TER
  const carCost = distAR * 0.25 // EUR (carburant + usure)
  const trainCost = distAR * 0.13 // EUR (estimation billet TER)
  const fmtTime = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`)
  const showCompare = distKm >= 2
  const eco = ecoScore(d)
  const categoryCounts = Object.entries(
    pois.reduce((counts, place) => ({ ...counts, [place.categorie]: (counts[place.categorie] || 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])
  const mainCategory = categoryCounts[0]?.[0]
  const closePlaces = pois.filter((place) => Number(place.distance_gare_km || 99) <= 2).length
  const highlights = pois
    .filter((place) => place.nom)
    .sort((a, b) => Number(b.note_moyenne || 0) - Number(a.note_moyenne || 0) || Number(a.distance_gare_km || 99) - Number(b.distance_gare_km || 99))
    .slice(0, 4)
  const reasons = [
    `${d.nb_poi_5km || pois.length} lieux recensés à moins de 5 km de la gare`,
    closePlaces ? `${closePlaces} lieux accessibles dans un rayon de 2 km` : 'Un point d’arrivée au cœur de la destination',
    mainCategory ? `Une offre particulièrement riche en ${mainCategory.toLowerCase()}` : null,
    d.profil_touristique ? `Une destination au profil ${d.profil_touristique.toLowerCase()}` : null,
  ].filter(Boolean)

  // Carte d'un lieu (reutilisee dans les groupes par centre d'interet).
  const renderCard = (p, key) => {
    const isSel = selected.includes(p.nom)
    const iconName = POI_ICON[p.categorie] || 'pin'
    const nom = cleanPoiName(p.nom) // parse "['xxx']" -> "xxx"
    // On n'affiche l'image QUE si une vraie image DATAtourisme est fournie.
    // Sinon on garde le placeholder categorie (fond doux + icone) : pas de
    // Picsum aleatoire qui casse la credibilite.
    const hasRealImage = Boolean(p.image_url && p.image_url.startsWith('http'))
    // Fallback : photo de la commune (galerie Wikipedia deja chargee)
    // Chaque POI d une meme ville partage le contexte visuel, choix stable par hash.
    const displayImage = hasRealImage ? p.image_url : poiFallbackImage(communeGallery, p.nom)
    return (
      <button
        key={key}
        onClick={() => toggle(p.nom)}
        className={`group overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all ${
          isSel ? 'border-eco ring-2 ring-eco/20' : 'border-line hover:border-eco/40'
        }`}
      >
        <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-eco/5 to-eco/15 text-eco">
          <Icon name={iconName} className="h-9 w-9 opacity-60" strokeWidth={1.5} />
          {displayImage && (
            <img
              src={displayImage}
              alt={nom}
              loading="lazy"
              title={p.image_credit || (hasRealImage ? 'Photo DATAtourisme' : 'Illustration Wikimedia Commons')}
              onError={(event) => { event.currentTarget.style.display = 'none' }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] font-semibold text-white backdrop-blur">
            {p.categorie}
          </span>
          <span
            className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow ${
              isSel ? 'bg-eco text-white' : 'bg-white/95 text-neutral-900'
            }`}
          >
            {isSel ? '✓' : '+'}
          </span>
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="line-clamp-2 font-semibold text-ink">{nom}</div>
            {p.note_moyenne > 0 && (
              <span className="flex flex-shrink-0 items-center gap-0.5 text-xs font-bold text-amber-500">
                <Icon name="star" className="h-3.5 w-3.5" />
                {Number(p.note_moyenne).toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted">
            {p.distance_gare_km != null ? `${Number(p.distance_gare_km).toFixed(1)} km` : ''}
            {p.temps_marche_min != null ? ` · ${Math.round(p.temps_marche_min)} min à pied` : ''}
          </div>
        </div>
      </button>
    )
  }

  // Groupes par centre d'interet (categorie). En vue "Tout", une section par
  // categorie ; sinon, uniquement la categorie choisie.
  const groups =
    cat === 'Tout'
      ? categoryCounts
          .map(([category]) => category)
          .filter((category) => category !== 'Autre')
          .slice(0, 4)
          .map((category) => ({ cat: category, items: pois.filter((p) => p.categorie === category).slice(0, 3) }))
          .filter((g) => g.items.length)
      : [{ cat, items: visible }]

  return (
    <div>
      {/* Hero image : Wikipedia si dispo, sinon degrade sobre navy */}
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {heroImg && (
          <img src={heroImg} alt={ville} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-page px-6 pb-7">
          <Link to="/destinations" className="mb-3 inline-block text-sm font-semibold text-white/70 hover:text-white">
            &larr; Toutes les destinations
          </Link>
          <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow md:text-5xl">{ville}</h1>
          <p className="mt-1 text-sm text-white/70">
            {cap(d.departement)}
            {d.profil_touristique ? ` - Profil ${d.profil_touristique}` : ''}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-page px-6 py-10">
        {/* Stats destination */}
        <div className="mb-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { v: d.score_attractivite != null ? Number(d.score_attractivite).toFixed(1) : '-', l: 'Score attractivite' },
            { v: d.nb_poi_5km ?? '-', l: 'Lieux a 5 km' },
            { v: d.nb_categories ?? '-', l: 'Categories' },
            weather?.current
              ? { v: `${Math.round(weather.current.temperature_2m)}°`, l: weatherLabel(weather.current.weather_code) }
              : { v: pois.length, l: 'Lieux affiches' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-line bg-card p-5 text-center shadow-card">
              <div className="text-2xl font-extrabold tracking-tighter text-violet">{s.v}</div>
              <div className="mt-1 text-xs font-medium text-muted">{s.l}</div>
            </div>
          ))}
        </div>
        {weather?.current && (
          <p className="mb-10 text-right text-xs text-muted">Ressenti {Math.round(weather.current.apparent_temperature)} °C · vent {Math.round(weather.current.wind_speed_10m)} km/h · données Open‑Meteo</p>
        )}

        <section className="mb-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-card">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-eco">Pourquoi choisir {ville} ?</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">Une escapade simple à vivre depuis la gare</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Arrivez en train, puis composez votre séjour à partir des lieux réellement recensés autour de la gare.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {reasons.map((reason) => <li key={reason} className="flex gap-3 rounded-xl bg-card2 p-3 text-sm text-ink"><span className="text-eco">✓</span><span>{reason}</span></li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-card p-6 shadow-card">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-eco">À ne pas manquer</p>
            <div className="mt-4 space-y-3">
              {highlights.map((place, index) => (
                <button key={`${place.nom}-${index}`} onClick={() => toggle(place.nom)} className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-eco">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-eco text-xs font-black text-white">{index + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-ink">{cleanPoiName(place.nom)}</span><span className="text-xs text-muted">{place.categorie}{place.distance_gare_km != null ? ` · ${Number(place.distance_gare_km).toFixed(1)} km de la gare` : ''}</span></span>
                  <span className="text-eco">+</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <a
            href={sncfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#e2001a] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#e2001a]/25 transition hover:bg-[#c4001a]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="3" width="16" height="13" rx="2" />
              <path d="M4 11h16M8 20l-2 2M16 20l2 2M9 16v2M15 16v2" strokeLinecap="round" />
            </svg>
            Acheter sur SNCF Connect
          </a>
          <button
            onClick={async () => {
              setTicketBusy(true)
              try {
                await generateTravelSummary({
                  origin: HUB.nom,
                  destination: ville,
                  departement: d.departement,
                  priceEur: trainCost,
                  co2SavedKg: co2Saved,
                  distanceKm: distKm,
                  activities: itinerary.map((place) => place.nom),
                })
              } finally {
                setTicketBusy(false)
              }
            }}
            disabled={ticketBusy}
            className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-violet px-6 py-3 text-sm font-bold text-violet transition hover:bg-violet hover:text-white disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {ticketBusy ? 'Génération...' : 'Télécharger le récapitulatif (PDF)'}
          </button>
        </div>

        {/* EcoScore : indice composite explicable (Data Science) */}
        <div className="mt-10 rounded-2xl border border-line bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-6">
            {/* Jauge circulaire */}
            <div className="relative h-28 w-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="10" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={ecoColor(eco.score)}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(eco.score / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black tracking-tighter text-ink">{eco.score}</span>
                <span className="text-[0.6rem] font-semibold text-muted">/ 100</span>
              </div>
            </div>

            <div className="min-w-[200px] flex-1">
              <h2 className="text-xl font-black tracking-tighter text-ink">
                EcoScore : <span style={{ color: ecoColor(eco.score) }}>{ecoLabel(eco.score)}</span>
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Indice composite calcule a partir du CO2 evite en train (45%), de
                l'attractivite touristique (30%) et de la richesse en activites (25%).
              </p>
            </div>

            {/* Decomposition */}
            <div className="w-full space-y-2.5 sm:w-72">
              {eco.components.map((c) => (
                <div key={c.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">
                      {c.key} <span className="font-normal text-muted">({c.weight}%)</span>
                    </span>
                    <span className="font-bold text-muted">{c.detail}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-card2">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.round(c.value * 100)}%`, background: ecoColor(eco.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparaison Train vs Voiture */}
        {showCompare && (
          <div className="mt-10">
            <h2 className="mb-1 text-2xl font-black tracking-tighter text-ink">Train ou voiture ?</h2>
            <p className="mb-4 text-sm text-muted">
              Aller-retour depuis {HUB.nom} ({Math.round(distAR)} km) - estimations indicatives.
            </p>
            <div className="overflow-hidden rounded-2xl border border-line shadow-card">
              <div className="grid grid-cols-3 border-b border-line bg-card2 text-xs font-bold uppercase tracking-wide text-muted">
                <div className="p-3" />
                <div className="p-3 text-center text-violet">Train</div>
                <div className="p-3 text-center">Voiture</div>
              </div>
              {[
                {
                  label: 'CO2 emis',
                  train: `${trainCo2.toFixed(1)} kg`,
                  car: `${carCo2.toFixed(1)} kg`,
                  good: true,
                },
                { label: 'Temps estime', train: fmtTime(trainTimeMin), car: fmtTime(carTimeMin) },
                {
                  label: 'Budget estime',
                  train: `~${trainCost.toFixed(0)} EUR`,
                  car: `~${carCost.toFixed(0)} EUR`,
                },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 border-b border-line text-sm last:border-0">
                  <div className="p-3 font-semibold text-ink">{row.label}</div>
                  <div className={`p-3 text-center font-bold ${row.good ? 'text-green-600' : 'text-ink'}`}>
                    {row.train}
                  </div>
                  <div className="p-3 text-center text-muted">{row.car}</div>
                </div>
              ))}
              <div className="bg-violet/5 p-3 text-center text-sm font-bold text-violet">
                En train : {co2Saved.toFixed(0)} kg de CO2 economises (~91% de moins)
              </div>
            </div>
          </div>
        )}

        {/* Prochains trains SNCF (Navitia temps réel) */}
        {schedules?.available && schedules.departures?.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-eco">
                  <Icon name="train" className="h-3 w-3" />
                  Temps réel · Navitia
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tighter text-ink">Prochains trains au départ</h2>
                <p className="mt-1 text-sm text-muted">Horaires officiels SNCF, mis à jour toutes les 5 minutes.</p>
              </div>
              <span className="text-[10px] font-semibold text-muted">
                Gare : {ville}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schedules.departures.map((dep, i) => {
                const min = dep.departure?.in_minutes
                const urgent = min != null && min <= 5
                const soon = min != null && min <= 20
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-4 transition ${urgent ? 'border-rose-300 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30' : soon ? 'border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30' : 'border-line bg-card'}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl font-black tracking-tight text-ink">
                        {dep.departure?.hour || '—'}
                      </span>
                      {min != null && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${urgent ? 'bg-rose-500 text-white' : soon ? 'bg-amber-500 text-white' : 'bg-eco/15 text-eco'}`}>
                          {min === 0 ? "à l'instant" : `dans ${min} min`}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 truncate text-sm font-bold text-ink" title={dep.direction}>
                      → {dep.direction || 'Direction —'}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                      <Icon name="train" className="h-3 w-3" />
                      {dep.commercial_mode || dep.network || 'SNCF'}
                      {dep.trip_short_name && <span className="rounded bg-card2 px-1.5 py-0.5 font-mono text-[10px] font-bold">{dep.trip_short_name}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mobilité locale — vraies données silver.mobilites */}
        <div className="mt-10">
          <h2 className="mb-1 text-2xl font-black tracking-tighter text-ink">Mobilité locale</h2>
          <p className="mb-4 text-sm text-muted">Se déplacer autour de la gare, sans voiture. Cliquez pour voir les stations.</p>
          <MobiliteCards
            mobilites={mobilites}
            activeTab={mobiliteTab}
            onSelectTab={setMobiliteTab}
          />
          {mobiliteTab && (
            <MobiliteList
              type={mobiliteTab}
              stations={mobilites?.[mobiliteTab === 'velo' ? 'velos' : mobiliteTab === 'bus' ? 'bus' : mobiliteTab === 'tram' ? 'trams' : 'ferries'] || []}
              onGoTo={(station) => {
                // Ajoute la station comme étape dans l'itinéraire → OSRM trace la route
                updateSelected([...(selected || []), station.nom_station])
                const mapEl = document.getElementById('itineraire-map')
                if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              onClose={() => setMobiliteTab(null)}
            />
          )}
        </div>

        {/* Carte */}
        {d.latitude && d.longitude && (
          <div id="itineraire-map" className="mt-10 scroll-mt-24">
            <h2 className="mb-4 text-2xl font-black tracking-tighter text-ink">Carte des environs</h2>
            <div className="h-[480px] overflow-hidden rounded-2xl border border-line shadow-sm">
              <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom={true}>
                <TileLayer key={dark ? 'dark' : 'light'} attribution='&copy; OpenStreetMap' url={tileUrl} />
                <Circle center={center} radius={2000} pathOptions={{ color: '#7c3aed', fillOpacity: 0.05 }} />
                <Marker position={center} icon={icon}>
                  <Popup>Gare de {ville}</Popup>
                </Marker>

                {visible.slice(0, 40).filter((place) => place.latitude && place.longitude).map((place, index) => (
                  <Marker key={`poi-map-${place.nom}-${index}`} position={[place.latitude, place.longitude]} icon={poiMapIcon(place.categorie)}>
                    <Popup><strong>{cleanPoiName(place.nom)}</strong><br />{place.categorie}{place.distance_gare_km != null ? ` · ${Number(place.distance_gare_km).toFixed(1)} km de la gare` : ''}</Popup>
                  </Marker>
                ))}

                {/* Trace itineraire style Google Maps : contour blanc + trait bleu epais */}
                {routeGeo ? (
                  <>
                    <Polyline positions={routeGeo} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.95 }} />
                    <Polyline positions={routeGeo} pathOptions={{ color: '#1F6FEB', weight: 5, opacity: 1 }} />
                  </>
                ) : itinPoints.length > 0 ? (
                  <>
                    <Polyline positions={linePositions} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
                    <Polyline positions={linePositions} pathOptions={{ color: '#1F6FEB', weight: 4, dashArray: '8 6' }} />
                  </>
                ) : null}
                {itinPoints.map((pos, i) => (
                  <CircleMarker
                    key={`it-${i}`}
                    center={pos}
                    radius={11}
                    pathOptions={{ color: '#fff', weight: 3, fillColor: '#1F6FEB', fillOpacity: 1 }}
                  >
                    <Popup>
                      <strong>Étape {i + 1}</strong><br />{cleanPoiName(itinerary[i].nom)}
                    </Popup>
                  </CircleMarker>
                ))}
                {/* Auto-zoom sur le trajet complet des qu il y a un itineraire */}
                <FitToRoute
                  positions={routeGeo || (itinPoints.length > 0 ? linePositions : null)}
                  fallbackCenter={center}
                />
                {/* Ecoute les events pan de la navigation etape par etape */}
                <PanListener defaultCenter={center} defaultZoom={13} />
              </MapContainer>
              {itinPoints.length > 0 && (
                <NavigationPanel
                  itinerary={itinerary}
                  center={center}
                  legs={useRealLegs ? routeInfo.legs : legs}
                  totalKm={displayKm}
                  totalMin={displayMin}
                />
              )}
            </div>
          </div>
        )}

        {/* Lieux + itineraire */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Colonne lieux */}
          <div className="lg:col-span-2">
            <h2 className="mb-1 text-2xl font-black tracking-tighter text-ink">Lieux a proximite de la gare</h2>
            <p className="mb-4 text-sm text-muted">Cliquez sur un lieu pour l'ajouter a votre itineraire.</p>

            {/* Filtres par categorie */}
            <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    cat === c
                      ? 'border-violet bg-violet text-white'
                      : 'border-line bg-card text-muted hover:border-violet hover:text-violet'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {groups.map((g) => (
              <div key={g.cat} className="mb-8">
                {cat === 'Tout' && (
                  <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-ink">
                    {g.cat}{' '}
                    <span className="font-semibold text-muted">
                      ({pois.filter((p) => p.categorie === g.cat).length})
                    </span>
                  </h3>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {g.items.map((p, i) => renderCard(p, `${g.cat}-${p.nom}-${i}`))}
                </div>
              </div>
            ))}
            {pois.length === 0 && <p className="text-sm text-muted">Aucun lieu enregistre a proximite.</p>}
          </div>

          {/* Colonne itineraire (sticky) */}
          <aside className="h-fit lg:sticky lg:top-20">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
              <h3 className="text-lg font-black tracking-tight text-ink">Mon itineraire</h3>

              {itinerary.length === 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Selectionnez des activites dans la liste pour composer votre journee. Le parcours
                  s'affichera sur la carte, ordonne par distance a la gare. Il est sauvegarde
                  automatiquement.
                </p>
              ) : (
                <>
                  <div className="mt-2 mb-4 text-xs font-semibold text-muted">
                    {itinerary.length} etape{itinerary.length > 1 ? 's' : ''}
                    {displayKm > 0 ? ` - ${displayKm.toFixed(1)} km - ~${displayMin} min a pied` : ''}
                  </div>
                  <ol className="space-y-0">
                    <li className="flex items-center gap-3 rounded-lg bg-card2 px-3 py-2">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                        G
                      </span>
                      <span className="text-sm font-semibold text-ink">Gare de {ville}</span>
                    </li>
                    {itinerary.map((p, idx) => (
                      <div key={`${p.nom}-${idx}`}>
                        {/* Troncon depuis l'etape precedente */}
                        <div className="ml-3 flex items-center gap-2 py-1 pl-3 text-[0.7rem] text-muted">
                          <span className="h-4 w-px bg-violet/40" />
                          {(useRealLegs ? routeInfo.legs[idx].km : legs[idx].km) > 0
                            ? `${(useRealLegs ? routeInfo.legs[idx].km : legs[idx].km).toFixed(1)} km - ~${
                                useRealLegs ? routeInfo.legs[idx].min : legs[idx].min
                              } min a pied`
                            : 'a proximite'}
                        </div>
                        <li className="flex items-start gap-3 rounded-lg border border-line px-3 py-2">
                          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-ink">{cleanPoiName(p.nom)}</div>
                            <div className="text-xs text-muted">{p.categorie}</div>
                          </div>
                          <button
                            onClick={() => toggle(p.nom)}
                            className="text-muted hover:text-violet"
                            aria-label="Retirer"
                          >
                            {'×'}
                          </button>
                        </li>
                      </div>
                    ))}
                  </ol>
                  {itinPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const mapEl = document.getElementById('itineraire-map')
                        if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet py-2.5 text-sm font-bold text-white transition hover:bg-violet-dark"
                    >
                      <Icon name="map" className="h-4 w-4" />
                      Voir l'itinéraire sur la carte
                    </button>
                  )}
                  <p className="mt-1.5 text-center text-[0.68rem] text-muted">
                    Tracé piéton calculé par OpenStreetMap, affiché directement dans l'application
                  </p>
                  <button
                    onClick={() => updateSelected([])}
                    className="mt-3 w-full rounded-lg border border-line py-2 text-sm font-semibold text-muted transition hover:border-violet hover:text-violet"
                  >
                    Vider l'itineraire
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// Ecoute l event global 'wandrail:pan-to' pour recentrer / zoomer la carte
// depuis le NavigationPanel qui vit HORS du MapContainer.
function PanListener({ defaultCenter, defaultZoom }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const handler = (e) => {
      const d = e.detail || {}
      if (d.reset) {
        map.setView(defaultCenter, defaultZoom, { animate: true })
      } else if (d.center) {
        map.setView(d.center, d.zoom || 17, { animate: true, duration: 0.6 })
      }
    }
    window.addEventListener('wandrail:pan-to', handler)
    return () => window.removeEventListener('wandrail:pan-to', handler)
  }, [map, defaultCenter, defaultZoom])
  return null
}

// Ajuste la vue Leaflet pour englober tout le trajet des qu il change.
// Utilise fitBounds avec padding pour laisser respirer le contenu.
function FitToRoute({ positions, fallbackCenter }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    if (positions && positions.length >= 2) {
      const bounds = L.latLngBounds(positions)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: true, duration: 0.6 })
    } else if (fallbackCenter) {
      map.setView(fallbackCenter, 14, { animate: true })
    }
  }, [map, positions ? positions.length : 0, positions ? positions[positions.length - 1]?.toString() : null])
  return null
}

// Panneau navigation type Google Maps : totaux + etape en cours + boutons
// Precedent / Suivant qui centrent la carte sur chaque etape successive.
function NavigationPanel({ itinerary, center, legs, totalKm, totalMin }) {
  const [step, setStep] = useState(0)
  const [active, setActive] = useState(false)
  const mapRef = useRef(null)

  const goTo = (i) => {
    if (i < 0 || i > itinerary.length) return
    setStep(i)
    setActive(true)
    const target = i === 0 ? center : [itinerary[i - 1].latitude, itinerary[i - 1].longitude]
    // On dispatche un event custom capte par le composant carte
    window.dispatchEvent(new CustomEvent('wandrail:pan-to', { detail: { center: target, zoom: 17 } }))
  }

  const totalStr = `${(totalKm || 0).toFixed(1)} km · ~${totalMin || 0} min à pied`

  return (
    <div ref={mapRef} className="mt-3 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
            <Icon name="map" className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-black text-ink">Navigation à pied</div>
            <div className="text-xs text-muted">{totalStr} · {itinerary.length} étape{itinerary.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        {!active ? (
          <button
            type="button"
            onClick={() => goTo(1)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-blue-700 active:scale-95"
          >
            Démarrer ▶
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goTo(Math.max(0, step - 1))}
              disabled={step <= 0}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink transition hover:border-blue-500 disabled:opacity-40"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-ink">
              {step} / {itinerary.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(Math.min(itinerary.length, step + 1))}
              disabled={step >= itinerary.length}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-ink transition hover:border-blue-500 disabled:opacity-40"
            >
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setActive(false); setStep(0); window.dispatchEvent(new CustomEvent('wandrail:pan-to', { detail: { reset: true } })) }}
              className="ml-2 text-xs font-semibold text-muted hover:text-rose-500"
            >
              Arrêter
            </button>
          </div>
        )}
      </div>
      {active && step > 0 && step <= itinerary.length && (
        <div className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-blue-950/40">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">{step}</span>
            Étape {step} sur {itinerary.length}
          </div>
          <div className="mt-2 text-sm font-bold text-ink">
            {cleanPoiName(itinerary[step - 1].nom)}
          </div>
          {legs[step - 1] && (
            <div className="mt-1 text-xs text-muted">
              {legs[step - 1].km.toFixed(2)} km depuis {step === 1 ? 'la gare' : "l'étape précédente"} · ~{legs[step - 1].min} min à pied
            </div>
          )}
        </div>
      )}
    </div>
  )
}
