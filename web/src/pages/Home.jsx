import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'
import { HERO_IMAGE } from '../lib/images'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [deps, setDeps] = useState([])
  const [dests, setDests] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [dep, setDep] = useState('')

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
    api.departements().then(setDeps).catch(() => {})
    api
      .destinations({ limit: 6 })
      .then(setDests)
      .catch(() => setDests([]))
      .finally(() => setLoading(false))
  }, [])

  const search = () => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (dep) params.set('departement', dep)
    navigate(`/destinations${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-page gap-10 px-6 py-12 lg:grid-cols-[1fr_520px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eco">
              Tourisme en train
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight text-ink md:text-6xl">
              Trouver une destination accessible en train.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
              Wandrail aide à explorer la France à partir des gares, avec des données
              touristiques, ferroviaires et géographiques consolidées.
            </p>

            <div className="mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Ville ou gare"
                className="h-12 flex-1 rounded-xl border border-line bg-card2 px-4 text-sm text-ink outline-none focus:border-eco"
              />
              <select
                value={dep}
                onChange={(e) => setDep(e.target.value)}
                aria-label="Département"
                className="h-12 rounded-xl border border-line bg-card2 px-4 text-sm text-ink outline-none focus:border-eco sm:w-52"
              >
                <option value="">Toute la France</option>
                {deps.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                onClick={search}
                className="h-12 rounded-xl bg-eco px-6 text-sm font-semibold text-white transition hover:bg-eco-dark"
              >
                Rechercher
              </button>
            </div>

            {stats && (
              <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted">
                <span>{fmt(stats.nb_gares)} gares</span>
                <span>{fmt(stats.nb_lieux)} lieux</span>
                <span>-{stats.co2_vs_voiture_pct}% CO2 vs voiture</span>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <img src={HERO_IMAGE} alt="Train en France" className="h-[360px] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-ink">Destinations</h2>
            <p className="mt-1 text-sm text-muted">Sélection nationale autour des gares.</p>
          </div>
          <button
            onClick={() => navigate('/destinations')}
            className="text-sm font-semibold text-eco hover:underline"
          >
            Tout voir
          </button>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dests.map((d) => (
              <DestinationCard key={d.nom_gare} dest={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
