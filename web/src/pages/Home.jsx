import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'
import PhotoCarousel from '../components/PhotoCarousel'
import Icon from '../components/Icon'
import WeatherIcon from '../components/WeatherIcon'
import { HERO_CAROUSEL } from '../lib/images'
import { useWeather } from '../lib/useWeather'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

const INSPIRATIONS = [
  { key: 'nature', label: 'Nature', icon: 'leaf' },
  { key: 'mer', label: 'Bord de mer', icon: 'pin' },
  { key: 'patrimoine', label: 'Patrimoine', icon: 'star' },
  { key: 'gastronomie', label: 'Gastronomie', icon: 'wine' },
  { key: 'romantique', label: 'Romantique', icon: 'heart' },
  { key: 'famille', label: 'En famille', icon: 'users' },
]

function ForecastCard() {
  const { days, loading } = useWeather()
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <WeatherIcon type="sun" className="h-5 w-5" />
        <span className="text-sm font-bold text-ink">Prévisions météo</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {loading || days.length === 0
          ? [0, 1, 2].map((k) => (
              <div key={k} className="h-24 animate-pulse rounded-xl bg-card2" />
            ))
          : days.map((d) => (
              <div key={d.date} className="rounded-xl bg-card2 py-2.5">
                <div className="text-xs font-semibold text-muted">{d.label}</div>
                <div className="mx-auto mt-1 flex justify-center">
                  <WeatherIcon type={d.icon} className="h-9 w-9" />
                </div>
                <div className="mt-1 text-sm font-bold text-ink">{d.tempMax}°</div>
              </div>
            ))}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [deps, setDeps] = useState([])
  const [dests, setDests] = useState([])
  const [loading, setLoading] = useState(true)
  const [dep, setDep] = useState('')
  const [voyageurs, setVoyageurs] = useState('Solo')
  const [budget, setBudget] = useState('')
  const [tempsMax, setTempsMax] = useState('')
  const [envie, setEnvie] = useState('')

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
    if (dep) params.set('departement', dep)
    if (envie) params.set('q', envie)
    navigate(`/destinations${params.toString() ? `?${params}` : ''}`)
  }

  const co2Total = stats?.co2_evite_tonnes_total
    ? Math.round(stats.co2_evite_tonnes_total)
    : 82

  return (
    <div className="bg-bg">
      {/* HERO */}
      <section className="mx-auto max-w-page px-4 pt-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="relative overflow-hidden rounded-[24px] bg-slate-900 shadow-sm">
            <div className="absolute inset-0">
              <PhotoCarousel images={HERO_CAROUSEL} alt="Voyage en train" interval={4200} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/45 to-slate-900/25" />
            </div>

            <div className="relative flex min-h-[520px] flex-col justify-end p-6 sm:p-10">
              <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                Où partirez-vous lors de votre prochaine escapade ?
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
                Découvrez des destinations accessibles en train, adaptées à vos envies,
                votre budget et votre façon de voyager.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-card shadow-lg md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
                <label className="flex flex-col justify-center bg-card px-4 py-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Départ</span>
                  <select
                    value={dep}
                    onChange={(e) => setDep(e.target.value)}
                    className="mt-0.5 border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option value="">Toute la France</option>
                    {deps.slice(0, 30).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col justify-center bg-card px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Voyageurs</span>
                  <select
                    value={voyageurs}
                    onChange={(e) => setVoyageurs(e.target.value)}
                    className="mt-0.5 border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option>Solo</option>
                    <option>Couple</option>
                    <option>Famille</option>
                    <option>Entre amis</option>
                    <option>Senior</option>
                  </select>
                </label>
                <label className="flex flex-col justify-center bg-card px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Budget</span>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="mt-0.5 border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option value="">Peu importe</option>
                    <option value="150">≤ 150 €</option>
                    <option value="300">≤ 300 €</option>
                    <option value="500">≤ 500 €</option>
                  </select>
                </label>
                <label className="flex flex-col justify-center bg-card px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Temps max</span>
                  <select
                    value={tempsMax}
                    onChange={(e) => setTempsMax(e.target.value)}
                    className="mt-0.5 border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option value="">Peu importe</option>
                    <option value="2">≤ 2 h</option>
                    <option value="3">≤ 3 h</option>
                    <option value="5">≤ 5 h</option>
                  </select>
                </label>
                <label className="flex flex-col justify-center bg-card px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Envies</span>
                  <input
                    value={envie}
                    onChange={(e) => setEnvie(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder="Nature, mer…"
                    className="mt-0.5 border-0 bg-transparent p-0 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-muted outline-none"
                  />
                </label>
                <div className="col-span-2 flex items-center bg-card p-2 md:col-span-1">
                  <button
                    onClick={search}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F7A4F] md:h-16 md:w-16 md:px-0"
                    aria-label="Trouver ma destination"
                  >
                    <Icon name="search" className="h-5 w-5" />
                    <span className="md:hidden">Trouver ma destination</span>
                  </button>
                </div>
              </div>

              {stats && (
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/85 sm:text-sm">
                  <span>{fmt(stats.nb_gares)} gares</span>
                  <span>•</span>
                  <span>{fmt(stats.nb_lieux)} lieux</span>
                  <span>•</span>
                  <span>−{stats.co2_vs_voiture_pct}% CO₂ vs voiture</span>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DCFCE7] text-lg">🌱</span>
                <span className="text-sm font-bold text-ink">Votre impact positif</span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-4xl font-black leading-none text-[#15803D]">{co2Total}</span>
                <span className="mb-1 text-sm font-semibold text-muted">kg CO₂ évités</span>
              </div>
              <p className="mt-1 text-xs text-muted">Sur un aller-retour moyen vs voiture.</p>
              <svg viewBox="0 0 200 30" className="mt-3 h-8 w-full text-[#15803D]">
                <path d="M5 20 L40 20 L45 12 L55 12 L60 20 L120 20 L125 10 L140 10 L145 20 L195 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="150" cy="20" r="3" fill="currentColor" />
              </svg>
            </div>

            <ForecastCard />

            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
              <div className="text-sm font-bold text-ink">Pourquoi le train ?</div>
              <ul className="mt-3 space-y-2.5 text-sm text-ink">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-xs">🌍</span>
                  <span>91 % de CO₂ en moins qu'en voiture</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-xs">🚉</span>
                  <span>Gares au cœur des villes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] text-xs">☕</span>
                  <span>Confort, paysages, temps pour soi</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Inspirations */}
      <section className="mx-auto max-w-page px-4 pt-14 sm:px-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-ink">Inspirations pour vous</h2>
          <p className="mt-1 text-sm text-muted">Trouvez le voyage qui vous ressemble.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {INSPIRATIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => navigate(`/destinations?q=${c.key}`)}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-[#15803D] hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D] transition group-hover:scale-110">
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-ink">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Destinations recommandées */}
      <section className="mx-auto max-w-page px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-ink">Destinations recommandées</h2>
            <p className="mt-1 text-sm text-muted">Sélection nationale autour des gares.</p>
          </div>
          <button
            onClick={() => navigate('/destinations')}
            className="text-sm font-semibold text-[#15803D] hover:underline"
          >
            Tout voir →
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

      {/* CTA */}
      <section className="mx-auto max-w-page px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#15803D] to-[#0F7A4F] p-8 sm:p-12">
          <div className="relative z-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h3 className="text-2xl font-black text-white sm:text-3xl">Prêt pour l'aventure ?</h3>
              <p className="mt-2 text-sm text-white/90 sm:text-base">
                Préparez votre prochain voyage en train en quelques clics. Simple, économique, bas carbone.
              </p>
            </div>
            <button
              onClick={() => navigate('/destinations')}
              className="rounded-xl bg-card px-6 py-3 text-sm font-bold text-[#15803D] shadow-sm transition hover:scale-[1.02]"
            >
              Créer mon voyage
            </button>
          </div>
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-card/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-4 h-32 w-32 rounded-full bg-card/10 blur-2xl" />
        </div>
      </section>
    </div>
  )
}
