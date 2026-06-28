import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'

export default function Favoris() {
  const { user, favorites } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    api
      .favorites(user.id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
    // re-charge quand la liste de favoris change
  }, [user, favorites])

  if (!user) {
    return (
      <div className="mx-auto max-w-page px-6 py-24 text-center text-muted">
        Connectez-vous pour retrouver vos destinations favorites.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <h1 className="text-3xl font-black tracking-tighter text-ink">Mes favoris</h1>
      <p className="mt-1 text-sm text-muted">
        {loading
          ? 'Chargement...'
          : `${items.length} destination${items.length > 1 ? 's' : ''} sauvegardee${
              items.length > 1 ? 's' : ''
            }`}
      </p>

      <div className="mt-8">
        {loading ? (
          <SkeletonGrid count={3} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-line bg-card p-12 text-center text-muted shadow-card">
            Aucun favori pour l'instant. Cliquez sur le cœur d'une destination pour l'ajouter ici.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <DestinationCard key={d.nom_gare} dest={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
