// Client API minimaliste vers le backend FastAPI.
// En dev : VITE_API_BASE vide -> Vite proxy /api vers localhost:8000.
// En prod : VITE_API_BASE = URL publique de l'API.

const BASE = import.meta.env.VITE_API_BASE || ''

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    throw new Error(`Erreur API ${res.status} sur ${path}`)
  }
  return res.json()
}

// POST / DELETE avec corps JSON. Renvoie le detail d'erreur du backend.
async function send(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
  favorites: (userId) => get(`/api/favorites/${userId}`),
  addFavorite: (userId, destination) =>
    send('POST', '/api/favorites', { user_id: userId, destination }),
  removeFavorite: (userId, destination) =>
    send('DELETE', '/api/favorites', { user_id: userId, destination }),
}
