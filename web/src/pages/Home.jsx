import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'
import { HERO_IMAGE } from '../lib/images'
import Icon from '../components/Icon'

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
      {/* HERO simple : photo, titre, recherche, KPI. Fond blanc partout. */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-page grid-cols-1 gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-ink md:text-5xl">
              Où souhaitez-vous partir ?
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              Trouvez une destination française accessible en train, avec ses activités,
              son impact carbone évité et les gares les plus proches.
            </p>

            {/* Barre de recherche compacte */}
            <div className="mt-8 flex max-w-xl flex-col gap-2 rounded-xl border border-line bg-card p-2 shadow-sm sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Icon name="search" className="h-5 w-5 flex-shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  placeholder="Ville ou destination"
                  className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
              <select
                value={dep}
                onChange={(e) => setDep(e.target.value)}
                aria-label="Département"
                className="h-11 rounded-lg border border-line bg-card px-3 text-sm text-ink outline-none focus:border-eco sm:w-48"
              >
                <option value="">Toute la France</option>
                {deps.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <button
                onClick={search}
                className="h-11 rounded-lg bg-eco px-6 text-sm font-semibold text-white transition hover:bg-eco-dark"
              >
                Rechercher
              </button>
            </div>

            {/* KPI discrets, sur une ligne */}
            {stats && (
              <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                <Kpi value={fmt(stats.nb_gares)} label="gares" />
                <Kpi value={fmt(stats.nb_lieux)} label="points d’intérêt" />
                <Kpi value={`-${stats.co2_vs_voiture_pct}%`} label="CO₂ vs voiture" accent />
              </div>
            )}
          </div>

          {/* Photo hero avec crédit */}
          <div className="relative hidden md:block">
            <div className="relative overflow-hidden rounded-2xl shadow-lg">
              <img
                src={HERO_IMAGE}
                alt="TGV en France"
                className="h-[380px] w-full object-cover"
              />
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[0.6rem] text-white/80">
                Photo : Wikimedia — CC BY-SA 3.0
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations populaires - grille compacte */}
      <section className="mx-auto max-w-page px-6 py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-ink md:text-3xl">
              Destinations populaires
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nos gares les plus attractives, avec le plus d’activités à proximité.
            </p>
          </div>
          <button
            onClick={() => navigate('/destinations')}
            className="hidden whitespace-nowrap text-sm font-semibold text-eco hover:underline sm:inline-flex sm:items-center sm:gap-1"
          >
            Voir toutes les destinations
            <Icon name="chevronRight" className="h-4 w-4" />
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

      {/* Comment ça marche - 3 étapes simples, style Rome2Rio */}
      <section className="border-t border-line bg-card2 px-6 py-14">
        <div className="mx-auto max-w-page">
          <h2 className="text-2xl font-black tracking-tight text-ink">Comment ça marche ?</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Step
              n={1}
              icon="search"
              title="Cherchez"
              text="Choisissez une destination, ou laissez-vous guider par département et par envie."
            />
            <Step
              n={2}
              icon="map"
              title="Explorez"
              text="Découvrez les activités, restaurants et lieux culturels autour de chaque gare."
            />
            <Step
              n={3}
              icon="train"
              title="Réservez"
              text="Comparez le train vs la voiture, puis achetez votre billet sur SNCF Connect."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function Kpi({ value, label, accent = false }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <div className={`text-2xl font-black ${accent ? 'text-eco' : 'text-ink'}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function Step({ n, icon, title, text }) {
  return (
    <div className="rounded-xl border border-line bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-eco/10 text-eco">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Étape {n}</span>
      </div>
      <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  )
}
