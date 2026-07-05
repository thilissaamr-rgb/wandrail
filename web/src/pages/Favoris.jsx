import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'
import { formatPlaceName } from '../lib/format'
import Icon from '../components/Icon'

function savedPlans() {
  const plans = []
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith('wandrail:itin:')) continue
      const activities = JSON.parse(localStorage.getItem(key)) || []
      if (activities.length) plans.push({ destination: key.slice('wandrail:itin:'.length), activities })
    }
  } catch {
    return []
  }
  return plans
}

export default function Favoris() {
  const { user, favorites } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(Boolean(user))
  const plans = useMemo(savedPlans, [])

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    api.favorites(user.id).then(setItems).catch(() => setItems([])).finally(() => setLoading(false))
  }, [user, favorites])

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-eco">Votre espace</p>
      <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink">Mon voyage</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Retrouvez les journées que vous avez composées et les destinations enregistrées. Wandrail prépare le séjour ; la réservation reste effectuée auprès des opérateurs officiels.</p>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div><h2 className="text-2xl font-black tracking-tight text-ink">Mes voyages préparés</h2><p className="mt-1 text-sm text-muted">Itinéraires sauvegardés automatiquement sur cet appareil.</p></div>
          <span className="rounded-full bg-eco/10 px-3 py-1 text-xs font-bold text-eco">{plans.length}</span>
        </div>
        {plans.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.destination} className="rounded-2xl border border-line bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wide text-eco">En préparation</div><h3 className="mt-1 text-xl font-black text-ink">{formatPlaceName(plan.destination)}</h3></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-eco/10 text-eco"><Icon name="train" /></span></div>
                <div className="mt-4 rounded-xl bg-card2 p-3 text-sm text-muted"><strong className="text-ink">{plan.activities.length}</strong> étape{plan.activities.length > 1 ? 's' : ''} choisie{plan.activities.length > 1 ? 's' : ''}</div>
                <ul className="mt-3 space-y-1 text-sm text-muted">{plan.activities.slice(0, 3).map((activity) => <li key={activity} className="truncate">• {formatPlaceName(activity)}</li>)}</ul>
                <Link to={`/destinations/${encodeURIComponent(plan.destination)}`} className="mt-5 flex w-full justify-center rounded-xl bg-eco px-4 py-2.5 text-sm font-bold text-white">Continuer à préparer</Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-line bg-card2 p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-eco/10 text-eco"><Icon name="map" className="h-6 w-6" /></div><h3 className="mt-3 font-bold text-ink">Aucun voyage préparé</h3><p className="mt-1 text-sm text-muted">Choisissez une destination puis ajoutez des lieux à votre itinéraire.</p><Link to="/destinations" className="mt-5 inline-flex rounded-full bg-eco px-5 py-2.5 text-sm font-bold text-white">Explorer les destinations</Link></div>
        )}
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <h2 className="text-2xl font-black tracking-tight text-ink">Mes favoris</h2>
        {!user ? (
          <div className="mt-5 rounded-2xl border border-line bg-card p-6 text-sm text-muted shadow-card">Connectez-vous pour synchroniser vos destinations favorites entre vos appareils.</div>
        ) : loading ? <div className="mt-5"><SkeletonGrid count={3} /></div> : items.length ? (
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((destination) => <DestinationCard key={destination.nom_gare} dest={destination} />)}</div>
        ) : (
          <div className="mt-5 rounded-2xl border border-line bg-card p-8 text-center text-sm text-muted">Aucun favori pour l’instant. Utilisez le cœur sur une destination pour l’enregistrer.</div>
        )}
      </section>
    </div>
  )
}
