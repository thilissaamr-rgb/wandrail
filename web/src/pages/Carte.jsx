import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../lib/api'
import { useTheme } from '../lib/theme.jsx'

const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

// Distance a vol d'oiseau (km).
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

// Couleur du point selon le score d'attractivite.
const colorFor = (s) => (s >= 8 ? '#7c3aed' : s >= 6 ? '#2563eb' : s >= 4 ? '#0d9488' : '#94a3b8')

// Marqueur "ma position".
const meIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#ec4899;border:3px solid #fff;box-shadow:0 0 0 4px rgba(236,72,153,.3)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// Recadre la carte quand la position change.
function FlyTo({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo(pos, 11, { duration: 1.2 })
  }, [pos, map])
  return null
}

export default function Carte() {
  const [gares, setGares] = useState([])
  const [userPos, setUserPos] = useState(null)
  const [geoMsg, setGeoMsg] = useState('')
  const [locating, setLocating] = useState(false)
  const mapRef = useRef(null)
  const { dark } = useTheme()
  const tileUrl = dark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  useEffect(() => {
    api.destinations({ limit: 200 }).then(setGares).catch(() => setGares([]))
  }, [])

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoMsg("La geolocalisation n'est pas disponible sur ce navigateur.")
      return
    }
    setLocating(true)
    setGeoMsg('')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUserPos([p.coords.latitude, p.coords.longitude])
        setLocating(false)
      },
      () => {
        setGeoMsg("Position refusee. Autorisez la localisation pour voir les gares proches.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  // 5 gares les plus proches de l'utilisateur.
  const nearest = useMemo(() => {
    if (!userPos) return []
    return gares
      .filter((g) => g.latitude && g.longitude)
      .map((g) => ({ ...g, dist: haversineKm(userPos, [g.latitude, g.longitude]) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5)
  }, [userPos, gares])

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-ink">Carte des gares</h1>
          <p className="mt-1 text-sm text-muted">
            {gares.length} gares des Pays de la Loire - cliquez un point pour explorer.
          </p>
        </div>
        <button
          onClick={locate}
          className="inline-flex items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet/25 transition hover:bg-violet-dark"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
          {locating ? 'Localisation...' : 'Autour de moi'}
        </button>
      </div>

      {geoMsg && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {geoMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Carte */}
        <div className="h-[68vh] overflow-hidden rounded-2xl border border-line shadow-card">
          <MapContainer
            center={[47.4, -0.8]}
            zoom={8}
            className="h-full w-full"
            scrollWheelZoom
            ref={mapRef}
          >
            <TileLayer key={dark ? 'dark' : 'light'} attribution="&copy; OpenStreetMap" url={tileUrl} />
            <FlyTo pos={userPos} />

            {gares
              .filter((g) => g.latitude && g.longitude)
              .map((g) => {
                const sc = Number(g.score_attractivite || 0)
                return (
                  <CircleMarker
                    key={g.nom_gare}
                    center={[g.latitude, g.longitude]}
                    radius={6 + Math.min(8, sc)}
                    pathOptions={{ color: '#fff', weight: 1.5, fillColor: colorFor(sc), fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <strong>{cap(g.commune || g.nom_gare)}</strong>
                      <br />
                      {cap(g.departement)} - score {sc.toFixed(1)}
                      <br />
                      {g.nb_poi_5km ? `${g.nb_poi_5km} activites` : ''}
                      <br />
                      <Link to={`/destinations/${encodeURIComponent(g.nom_gare)}`} style={{ color: '#7c3aed', fontWeight: 700 }}>
                        Explorer
                      </Link>
                    </Popup>
                  </CircleMarker>
                )
              })}

            {userPos && (
              <Marker position={userPos} icon={meIcon}>
                <Popup>Vous etes ici</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Panneau gares proches */}
        <aside className="h-fit rounded-2xl border border-line bg-card p-5 shadow-card">
          <h2 className="text-sm font-black uppercase tracking-wide text-ink">Gares proches</h2>
          {nearest.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Cliquez sur "Autour de moi" pour afficher les gares les plus proches de votre position.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {nearest.map((g, i) => (
                <li key={g.nom_gare}>
                  <Link
                    to={`/destinations/${encodeURIComponent(g.nom_gare)}`}
                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 transition hover:border-violet/50"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {cap(g.commune || g.nom_gare)}
                      </span>
                      <span className="text-xs text-muted">
                        {g.dist.toFixed(0)} km - {cap(g.departement)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-line pt-4">
            <div className="text-xs font-semibold text-muted">Legende (score)</div>
            <div className="mt-2 space-y-1 text-xs text-muted">
              {[
                ['#7c3aed', 'Excellent (8+)'],
                ['#2563eb', 'Tres bien (6-8)'],
                ['#0d9488', 'Bien (4-6)'],
                ['#94a3b8', 'Plus discret'],
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
