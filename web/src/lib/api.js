// Client API minimaliste vers le backend FastAPI.
// En dev : VITE_API_BASE vide -> Vite proxy /api vers localhost:8000.
// En prod : VITE_API_BASE = URL publique de l'API.

const BASE = import.meta.env.VITE_API_BASE || ''

function authHeaders() {
  try {
    const token = JSON.parse(localStorage.getItem('wandrail:user'))?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function get(path, authenticated = false) {
  const res = await fetch(`${BASE}${path}`, {
    headers: authenticated ? authHeaders() : {},
  })
  if (!res.ok) {
    throw new Error(`Erreur API ${res.status} sur ${path}`)
  }
  return res.json()
}

// POST / DELETE avec corps JSON. Renvoie le detail d'erreur du backend.
async function send(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || `Erreur API ${res.status}`)
  }
  return data
}

export const api = {
  stats: () => get('/api/stats'),
  dataQuality: () => get('/api/data-quality'),
  departements: () => get('/api/departements'),
  profils: () => get('/api/profils'),
  destinations: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    ).toString()
    return get(`/api/destinations${qs ? `?${qs}` : ''}`)
  },
  destination: (nom, rayon) =>
    get(`/api/destinations/${encodeURIComponent(nom)}${rayon ? `?rayon=${rayon}` : ''}`),
  recommandations: (profil) => get(`/api/recommandations/${encodeURIComponent(profil)}`),

  // Authentification
  register: (payload) => send('POST', '/api/auth/register', payload),
  login: (payload) => send('POST', '/api/auth/login', payload),

  // Favoris
  favorites: () => get('/api/favorites', true),
  addFavorite: (_userId, destination) => send('POST', '/api/favorites', { destination }),
  removeFavorite: (_userId, destination) => send('DELETE', '/api/favorites', { destination }),
}
