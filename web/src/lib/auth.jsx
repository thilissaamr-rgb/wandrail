import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

// Etat d'authentification + favoris, partages dans toute l'app.
// L'utilisateur est conserve en localStorage (POC : pas de token serveur).
const AuthContext = createContext(null)

const STORE = 'wandrail:user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || null
    } catch {
      return null
    }
  })
  const [favorites, setFavorites] = useState(new Set())

  const persist = (u) => {
    setUser(u)
    try {
      if (u) localStorage.setItem(STORE, JSON.stringify(u))
      else localStorage.removeItem(STORE)
    } catch {
      /* mode prive */
    }
  }

  // Charge les favoris de l'utilisateur connecte.
  const loadFavorites = useCallback((u) => {
    if (!u) {
      setFavorites(new Set())
      return
    }
    api
      .favorites(u.id)
      .then((rows) => setFavorites(new Set(rows.map((r) => r.nom_gare))))
      .catch(() => setFavorites(new Set()))
  }, [])

  useEffect(() => {
    loadFavorites(user)
    // au montage uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email, password) => {
    const u = await api.login({ email, password })
    persist(u)
    loadFavorites(u)
    return u
  }

  const register = async (payload) => {
    const u = await api.register(payload)
    persist(u)
    loadFavorites(u)
    return u
  }

  const logout = () => {
    persist(null)
    setFavorites(new Set())
  }

  const isFavorite = (nomGare) => favorites.has(nomGare)

  const toggleFavorite = async (nomGare) => {
    if (!user) return false
    const next = new Set(favorites)
    if (next.has(nomGare)) {
      next.delete(nomGare)
      setFavorites(next)
      api.removeFavorite(user.id, nomGare).catch(() => {})
      return false
    }
    next.add(nomGare)
    setFavorites(next)
    api.addFavorite(user.id, nomGare).catch(() => {})
    return true
  }

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, favorites, isFavorite, toggleFavorite }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
