import { useEffect, useState } from 'react'

// Open-Meteo : API gratuite, sans cle, CORS ouvert.
// On recupere les 3 prochains jours (max temperature + weather_code).
// Code WMO -> icone (voir mapCode) : soleil, nuage, pluie, neige, orage...

const cache = new Map() // key: "lat,lon" -> Promise|Array

const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
// Labels sémantiques : la meteo doit etre utile pour preparer un voyage,
// pas seulement un week-end. On indique la fenetre relative a aujourd'hui.
const RELATIVE = ["Aujourd'hui", 'Demain', 'Après-demain']

function mapCode(code) {
  if (code == null) return 'cloud'
  if (code === 0) return 'sun'
  if (code <= 3) return 'partly'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'rain'
  if (code <= 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloud'
}

async function fetchWeather(lat, lon) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  if (cache.has(key)) {
    const hit = cache.get(key)
    return hit instanceof Promise ? await hit : hit
  }
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto&forecast_days=3`
  const p = fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d?.daily) throw new Error('no data')
      const days = d.daily.time.map((iso, i) => {
        const date = new Date(iso)
        return {
          date: iso,
          label: RELATIVE[i] || `J+${i}`,
          dayShort: DAYS_SHORT[date.getDay()],
          tempMax: Math.round(d.daily.temperature_2m_max[i]),
          tempMin: Math.round(d.daily.temperature_2m_min[i]),
          icon: mapCode(d.daily.weather_code[i]),
          code: d.daily.weather_code[i],
        }
      })
      cache.set(key, days)
      return days
    })
    .catch(() => {
      cache.set(key, [])
      return []
    })
  cache.set(key, p)
  return await p
}

// Meteo pour un point (par defaut Paris).
export function useWeather(lat = 48.8566, lon = 2.3522) {
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchWeather(lat, lon).then((d) => {
      if (!cancelled) {
        setDays(d)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [lat, lon])
  return { days, loading }
}
