import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { api } from '../lib/api'
import Icon from '../components/Icon'
import { formatPlaceName } from '../lib/format'

export default function Profil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('voyages')
  const [favorites, setFavorites] = useState([])
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    // Favoris depuis l'API
    api
      .favorites(user.id)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false))

    // Mes voyages : itineraires enregistres en local (les cles wandrail:itin:*)
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('wandrail:itin:'))
      const list = keys
        .map((k) => {
          const nom = k.replace('wandrail:itin:', '')
          const stops = JSON.parse(localStorage.getItem(k) || '[]')
          return { nom, stops }
        })
        .filter((t) => t.stops.length > 0)
      setTrips(list)
    } catch {
      setTrips([])
    }
  }, [user])

  if (!user) {
    return (
      <div className="mx-auto max-w-page px-6 py-24 text-center">
        <Icon name="user" className="mx-auto h-12 w-12 text-muted" />
        <h1 className="mt-4 text-2xl font-bold text-ink">Connectez-vous</h1>
        <p className="mt-2 text-sm text-muted">
          Pour retrouver vos favoris, vos voyages et vos billets, connectez-vous à votre compte.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 rounded-lg bg-eco px-6 py-2.5 text-sm font-semibold text-white hover:bg-eco-dark"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      {/* En-tete profil */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-eco text-2xl font-bold text-white">
            {user.pseudo?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">{user.pseudo}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-red-300 hover:text-red-600"
        >
          <Icon name="logout" className="h-4 w-4" />
          Déconnexion
        </button>
      </div>

      {/* Onglets */}
      <div className="mt-6 flex gap-1 border-b border-line">
        {[
          ['voyages', 'Mes voyages', trips.length],
          ['favoris', 'Favoris', favorites.length],
          ['billets', 'Billets', 0],
        ].map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === key
                ? 'border-eco text-eco'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="rounded-full bg-card2 px-2 py-0.5 text-xs">{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <div className="mt-8">
        {tab === 'voyages' && (
          <>
            {trips.length === 0 ? (
              <EmptyState
                icon="map"
                title="Pas encore de voyage"
                text="Vos itinéraires apparaîtront ici. Ouvrez une destination pour commencer à composer votre journée."
                cta="Explorer les destinations"
                onClick={() => navigate('/destinations')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {trips.map((t) => (
                  <Link
                    key={t.nom}
                    to={`/destinations/${encodeURIComponent(t.nom)}`}
                    className="rounded-xl border border-line bg-card p-5 shadow-sm transition hover:border-eco hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-muted">
                      <Icon name="map" className="h-4 w-4" />
                      Itinéraire enregistré
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-ink">{formatPlaceName(t.nom)}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {t.stops.length} étape{t.stops.length > 1 ? 's' : ''} sélectionnée{t.stops.length > 1 ? 's' : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'favoris' && (
          <>
            {loading ? (
              <p className="py-10 text-center text-sm text-muted">Chargement...</p>
            ) : favorites.length === 0 ? (
              <EmptyState
                icon="heart"
                title="Aucun favori"
                text="Cliquez sur le cœur d'une destination pour l'enregistrer ici."
                cta="Découvrir des destinations"
                onClick={() => navigate('/destinations')}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((f) => (
                  <Link
                    key={f.nom_gare}
                    to={`/destinations/${encodeURIComponent(f.nom_gare)}`}
                    className="rounded-xl border border-line bg-card p-4 shadow-sm transition hover:border-eco hover:shadow-md"
                  >
                    <h3 className="font-bold text-ink">
                      {formatPlaceName(f.commune || f.nom_gare)}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {formatPlaceName(f.departement)}
                    </p>
                    {f.nb_poi_5km && (
                      <p className="mt-2 text-xs text-muted">
                        {f.nb_poi_5km.toLocaleString('fr-FR')} activités à proximité
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'billets' && (
          <EmptyState
            icon="ticket"
            title="Pas de billet"
            text="Les billets que vous téléchargez depuis les fiches destination apparaîtront ici."
            cta="Explorer les destinations"
            onClick={() => navigate('/destinations')}
          />
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, text, cta, onClick }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card2 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-card text-muted">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{text}</p>
      {cta && (
        <button
          onClick={onClick}
          className="mt-5 rounded-lg bg-eco px-5 py-2 text-sm font-semibold text-white hover:bg-eco-dark"
        >
          {cta}
        </button>
      )}
    </div>
  )
}
