import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../lib/api'
import { useTheme } from '../lib/theme.jsx'
import { usePlaceImage } from '../lib/usePlaceImage'
import { destImage } from '../lib/images'
import { formatPlaceName } from '../lib/format'
import Icon, { iconSvg } from '../components/Icon'

const CATEGORIES = [
  ['', 'Toutes'],
  ['Nature', 'Nature'],
  ['Restauration', 'Gastronomie'],
  ['Culture', 'Culture'],
  ['Patrimoine', 'Patrimoine'],
  ['Hebergement', 'Hébergements'],
  ['Loisirs', 'Loisirs'],
]

const scoreColor = (score) => {
  if (score >= 8) return '#0a5c36'
  if (score >= 6) return '#16845a'
  if (score >= 4) return '#3f8f83'
  return '#64748b'
}

const stationIcon = (score) =>
  L.divIcon({
    className: 'wandrail-map-icon',
    html: `<div class="wandrail-station-marker" style="--marker:${scoreColor(score)}" aria-hidden="true">${iconSvg('train', 19)}</div>`,
    iconSize: [38, 44],
    iconAnchor: [19, 42],
  })

const clusterIcon = (count, score) =>
  L.divIcon({
    className: 'wandrail-map-icon',
    html: `<div class="wandrail-cluster-marker" style="--marker:${scoreColor(score)}"><span>${count}</span><small>gares</small></div>`,
    iconSize: [58, 58],
    iconAnchor: [29, 29],
  })

const meIcon = L.divIcon({
  className: 'wandrail-map-icon',
  html: '<div class="wandrail-me-marker"><span></span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function gridSize(zoom) {
  if (zoom <= 5) return 2.2
  if (zoom === 6) return 1.15
  if (zoom === 7) return 0.6
  if (zoom === 8) return 0.3
  return 0
}

function MapExplorer({ gares, userPos, onSelect }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())
  const [bounds, setBounds] = useState(map.getBounds())

  useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom())
      setBounds(map.getBounds())
    },
    moveend: () => setBounds(map.getBounds()),
  })

  const markers = useMemo(() => {
    const valid = gares.filter((g) => Number.isFinite(Number(g.latitude)) && Number.isFinite(Number(g.longitude)))
    const baseSize = gridSize(zoom)
    const size = baseSize && map.getSize().x < 700 ? baseSize * 1.7 : baseSize
    if (!size) {
      return valid
        .filter((g) => bounds.pad(0.25).contains([Number(g.latitude), Number(g.longitude)]))
        .map((g) => ({ lat: Number(g.latitude), lon: Number(g.longitude), score: Number(g.score_attractivite || 0), items: [g] }))
    }
    const scoped = zoom >= 7
      ? valid.filter((g) => bounds.pad(0.2).contains([Number(g.latitude), Number(g.longitude)]))
      : valid
    const groups = new Map()
    scoped.forEach((g) => {
      const lat = Number(g.latitude)
      const lon = Number(g.longitude)
      const key = `${Math.floor(lat / size)}:${Math.floor(lon / size)}`
      const group = groups.get(key) || []
      group.push(g)
      groups.set(key, group)
    })
    return [...groups.values()].map((items) => ({
      lat: items.reduce((sum, g) => sum + Number(g.latitude), 0) / items.length,
      lon: items.reduce((sum, g) => sum + Number(g.longitude), 0) / items.length,
      score: Math.max(...items.map((g) => Number(g.score_attractivite || 0))),
      items,
    }))
  }, [gares, zoom, bounds, map])

  return (
    <>
      {markers.map((group) => {
        const single = group.items.length === 1 && zoom >= 9
        return (
          <Marker
            key={`${group.lat}-${group.lon}-${group.items.length}`}
            position={[group.lat, group.lon]}
            icon={single ? stationIcon(group.score) : clusterIcon(group.items.length, group.score)}
            eventHandlers={{
              click: () => {
                if (single) onSelect(group.items[0])
                else map.flyTo([group.lat, group.lon], Math.min(zoom + 2, 10), { duration: 0.65 })
              },
            }}
          />
        )
      })}
      {userPos && <Marker position={userPos} icon={meIcon} />}
    </>
  )
}

function FlyTo({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 11, { duration: 0.8 })
  }, [position, map])
  return null
}

function DestinationPanel({ destination, onClose }) {
  const name = formatPlaceName(destination?.commune || destination?.nom_gare || '')
  const image = usePlaceImage(name, destination ? destImage(name, 640, 360) : null)
  if (!destination) return null
  return (
    <aside className="overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
      <div className="relative h-32 bg-card2">
        {image && <img src={image} alt={name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button onClick={onClose} aria-label="Fermer la fiche" className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg text-white">×</button>
        <h2 className="absolute bottom-3 left-4 right-4 text-xl font-black text-white">{name}</h2>
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-muted">{formatPlaceName(destination.departement)}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-card2 p-3"><div className="text-lg font-black text-eco">{Number(destination.score_attractivite || 0).toFixed(1)}</div><div className="text-[0.68rem] text-muted">Attractivité</div></div>
          <div className="rounded-xl bg-card2 p-3"><div className="text-lg font-black text-ink">{destination.nb_poi_5km || 0}</div><div className="text-[0.68rem] text-muted">Lieux à 5 km</div></div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">Une destination accessible en train, avec des lieux à découvrir autour de la gare.</p>
        <Link to={`/destinations/${encodeURIComponent(destination.nom_gare)}`} className="mt-4 flex w-full items-center justify-center rounded-xl bg-eco px-4 py-3 text-sm font-bold text-white transition hover:bg-eco-dark">Découvrir la destination</Link>
      </div>
    </aside>
  )
}

export default function Carte() {
  const [gares, setGares] = useState([])
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [userPos, setUserPos] = useState(null)
  const [geoMsg, setGeoMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const { dark } = useTheme()
  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    api.destinations({ limit: 5000, categorie: category })
      .then(setGares)
      .catch(() => setGares([]))
      .finally(() => setLoading(false))
  }, [category])

  const visibleGares = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return gares
    return gares.filter((g) => `${g.commune || ''} ${g.nom_gare || ''} ${g.departement || ''}`.toLowerCase().includes(term))
  }, [gares, query])

  const locate = () => {
    if (!navigator.geolocation) return setGeoMsg('La géolocalisation n’est pas disponible sur ce navigateur.')
    setGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (position) => setUserPos([position.coords.latitude, position.coords.longitude]),
      () => setGeoMsg('Autorisez la localisation pour afficher les gares autour de vous.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="mx-auto max-w-page px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-eco">Explorer les destinations</p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink">Où le train peut-il vous emmener ?</h1>
          <p className="mt-1 text-sm text-muted">{loading ? 'Chargement des gares…' : `${visibleGares.length.toLocaleString('fr-FR')} destinations — zoomez pour révéler les gares.`}</p>
        </div>
        <button onClick={locate} className="inline-flex items-center gap-2 rounded-full bg-eco px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-eco/20 transition hover:bg-eco-dark">◎ Autour de moi</button>
      </div>

      {geoMsg && <div className="mb-4 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{geoMsg}</div>}

      <div className="relative h-[72vh] min-h-[560px] overflow-hidden rounded-3xl border border-line bg-card2 shadow-card">
        <MapContainer center={[46.6, 2.4]} zoom={6} minZoom={5} maxZoom={15} className="h-full w-full" scrollWheelZoom zoomControl>
          <TileLayer key={dark ? 'dark' : 'light'} attribution='&copy; OpenStreetMap &copy; CARTO' url={tileUrl} />
          <MapExplorer gares={visibleGares} userPos={userPos} onSelect={setSelected} />
          <FlyTo position={userPos} />
        </MapContainer>

        <div className="pointer-events-none absolute left-3 right-3 top-3 z-[1000] flex flex-col gap-2 lg:right-auto lg:w-[620px]">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/50 bg-card/95 p-2 shadow-xl backdrop-blur">
            <span className="pl-2 text-muted">⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ville, gare ou département" className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" />
            {query && <button onClick={() => setQuery('')} className="rounded-full px-2 text-muted" aria-label="Effacer la recherche">×</button>}
          </div>
          <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(([value, label]) => (
              <button key={value || 'all'} onClick={() => setCategory(value)} className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-bold shadow-sm transition ${category === value ? 'border-eco bg-eco text-white' : 'border-line bg-card/95 text-ink backdrop-blur hover:border-eco'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-5 right-5 z-[1000] hidden w-72 lg:block">
          {selected ? <DestinationPanel destination={selected} onClose={() => setSelected(null)} /> : (
            <div className="rounded-2xl border border-line bg-card/95 p-4 text-sm shadow-xl backdrop-blur">
              <div className="font-bold text-ink">Comment explorer ?</div>
              <p className="mt-1 leading-relaxed text-muted">Cliquez sur un groupe pour zoomer, puis sur une gare pour découvrir sa destination.</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-eco text-white"><Icon name="train" className="h-4 w-4" /></span> Gare accessible en train</div>
            </div>
          )}
        </div>
      </div>

      {selected && <div className="mt-4 lg:hidden"><DestinationPanel destination={selected} onClose={() => setSelected(null)} /></div>}
    </div>
  )
}
