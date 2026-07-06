import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'
import PhotoCarousel from '../components/PhotoCarousel'
import Icon from '../components/Icon'
import WeatherIcon from '../components/WeatherIcon'
import { HERO_CAROUSEL, INSPIRATION_PLACES } from '../lib/images'
import { useWeather } from '../lib/useWeather'
import { useCountUp } from '../lib/useCountUp'
import { usePlaceImage } from '../lib/usePlaceImage'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

const INSPIRATIONS = [
  { key: 'nature', label: 'Nature', place: INSPIRATION_PLACES.nature, tint: 'from-emerald-900/80' },
  { key: 'mer', label: 'Bord de mer', place: INSPIRATION_PLACES.mer, tint: 'from-sky-900/80' },
  { key: 'patrimoine', label: 'Patrimoine', place: INSPIRATION_PLACES.patrimoine, tint: 'from-amber-900/80' },
  { key: 'gastronomie', label: 'Gastronomie', place: INSPIRATION_PLACES.gastronomie, tint: 'from-rose-900/80' },
  { key: 'romantique', label: 'Romantique', place: INSPIRATION_PLACES.romantique, tint: 'from-fuchsia-900/80' },
  { key: 'famille', label: 'En famille', place: INSPIRATION_PLACES.famille, tint: 'from-indigo-900/80' },
]

function InspirationCard({ item, delay, onClick }) {
  const img = usePlaceImage(item.place, null)
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-card2 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animation: `wxfadein .6s ease-out ${delay}ms both` }}
    >
      {img ? (
        <img
          src={img}
          alt={item.label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${item.tint} to-black/70`} />
      )}
      <div className={`absolute inset-0 bg-gradient-to-t ${item.tint} via-black/25 to-transparent transition-opacity duration-300 group-hover:opacity-90`} />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="text-sm font-black text-white drop-shadow">{item.label}</div>
        <div className="mt-0.5 flex translate-y-1 items-center gap-1 text-[11px] font-semibold text-white/90 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          Explorer
          <Icon name="chevronRight" className="h-3 w-3" />
        </div>
      </div>
    </button>
  )
}

// Compteur anime rendu sur un span, avec formatage FR (espaces milliers).
function AnimatedNumber({ value, suffix = '', className = '' }) {
  const [n, ref] = useCountUp(value)
  return (
    <span ref={ref} className={className}>
      {fmt(n)}
      {suffix}
    </span>
  )
}

function ForecastCard() {
  const { days, loading } = useWeather()
  return (
    <div className="group rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/15">
            <WeatherIcon type="sun" className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold text-ink">Prévisions météo</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">3 jours</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {loading || days.length === 0
          ? [0, 1, 2].map((k) => (
              <div key={k} className="h-28 animate-pulse rounded-xl bg-card2" />
            ))
          : days.map((d, i) => (
              <div
                key={d.date}
                className="rounded-xl bg-card2 py-3 transition duration-300 hover:-translate-y-0.5 hover:bg-card2/80"
                style={{ animation: `wxfadein .5s ease-out ${i * 90}ms both` }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{d.label}</div>
                <div className="mx-auto mt-1.5 flex justify-center">
                  <WeatherIcon type={d.icon} className="h-9 w-9" />
                </div>
                <div className="mt-1.5 text-base font-black text-ink">{d.tempMax}°</div>
                <div className="text-[10px] font-medium text-muted">min {d.tempMin}°</div>
              </div>
            ))}
      </div>
      <style>{`@keyframes wxfadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
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
          <div className="relative overflow-hidden rounded-[24px] bg-slate-800 shadow-sm">
            <div className="absolute inset-0">
              <PhotoCarousel
                images={HERO_CAROUSEL}
                alt="Voyager en train à travers de superbes paysages"
                interval={6000}
                kenBurns
              />
              {/* Voile ultra leger : la photo reste l element principal.
                  Le titre a du drop-shadow pour rester lisible sans assombrir tout. */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
            </div>

            <div className="relative flex min-h-[560px] flex-col justify-end p-6 sm:p-10">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ring-white/20">
                <Icon name="train" className="h-3.5 w-3.5" />
                Votre prochaine aventure commence sur les rails
              </span>
              <h1
                className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)] sm:text-5xl"
                style={{ animation: 'heroin .8s ease-out both' }}
              >
                Où partirez-vous lors de votre prochaine escapade ?
              </h1>
              <p
                className="mt-4 max-w-xl text-sm leading-6 text-white/95 drop-shadow-[0_1px_10px_rgba(0,0,0,0.4)] sm:text-base"
                style={{ animation: 'heroin .8s ease-out .15s both' }}
              >
                Découvrez des destinations accessibles en train, adaptées à vos envies,
                votre budget et votre façon de voyager.
              </p>

              <div
                className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line shadow-2xl ring-1 ring-black/5 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]"
                style={{ animation: 'heroin .8s ease-out .3s both' }}
              >
                <label className="group flex flex-col justify-center bg-card px-4 py-3 text-left transition-colors focus-within:bg-eco/5 hover:bg-card2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Départ</span>
                  <select
                    value={dep}
                    onChange={(e) => setDep(e.target.value)}
                    className="mt-0.5 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option value="">Toute la France</option>
                    {deps.slice(0, 30).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label className="group flex flex-col justify-center bg-card px-4 py-3 transition-colors focus-within:bg-eco/5 hover:bg-card2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Voyageurs</span>
                  <select
                    value={voyageurs}
                    onChange={(e) => setVoyageurs(e.target.value)}
                    className="mt-0.5 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option>Solo</option>
                    <option>Couple</option>
                    <option>Famille</option>
                    <option>Entre amis</option>
                    <option>Senior</option>
                  </select>
                </label>
                <label className="group flex flex-col justify-center bg-card px-4 py-3 transition-colors focus-within:bg-eco/5 hover:bg-card2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Budget</span>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="mt-0.5 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option value="">Peu importe</option>
                    <option value="150">≤ 150 €</option>
                    <option value="300">≤ 300 €</option>
                    <option value="500">≤ 500 €</option>
                  </select>
                </label>
                <label className="group flex flex-col justify-center bg-card px-4 py-3 transition-colors focus-within:bg-eco/5 hover:bg-card2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Temps max</span>
                  <select
                    value={tempsMax}
                    onChange={(e) => setTempsMax(e.target.value)}
                    className="mt-0.5 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-ink outline-none"
                  >
                    <option value="">Peu importe</option>
                    <option value="2">≤ 2 h</option>
                    <option value="3">≤ 3 h</option>
                    <option value="5">≤ 5 h</option>
                  </select>
                </label>
                <label className="group flex flex-col justify-center bg-card px-4 py-3 transition-colors focus-within:bg-eco/5 hover:bg-card2">
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
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] px-6 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:scale-[1.02] hover:bg-[#0F7A4F] hover:shadow-emerald-900/30 active:scale-[0.98] md:h-16 md:w-16 md:px-0"
                    aria-label="Trouver ma destination"
                  >
                    <Icon name="search" className="h-5 w-5" />
                    <span className="md:hidden">Trouver ma destination</span>
                  </button>
                </div>
              </div>

              {stats && (
                <div
                  className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-sm"
                  style={{ animation: 'heroin .8s ease-out .45s both' }}
                >
                  <span className="inline-flex items-baseline gap-1">
                    <AnimatedNumber value={stats.nb_gares} className="text-base font-black text-white sm:text-lg" />
                    <span>gares</span>
                  </span>
                  <span className="opacity-40">•</span>
                  <span className="inline-flex items-baseline gap-1">
                    <AnimatedNumber value={stats.nb_lieux} className="text-base font-black text-white sm:text-lg" />
                    <span>lieux</span>
                  </span>
                  <span className="opacity-40">•</span>
                  <span className="inline-flex items-baseline gap-1">
                    <span>−</span>
                    <AnimatedNumber value={stats.co2_vs_voiture_pct} suffix="%" className="text-base font-black text-white sm:text-lg" />
                    <span>CO₂ vs voiture</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite */}
          <div className="flex flex-col gap-4">
            <div className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-[#15803D] dark:bg-emerald-500/15">
                  <Icon name="leaf" className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-bold text-ink">Votre impact positif</span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <AnimatedNumber value={co2Total} className="text-4xl font-black leading-none text-[#15803D]" />
                <span className="mb-1 text-sm font-semibold text-muted">kg CO₂ évités</span>
              </div>
              <p className="mt-1 text-xs text-muted">Sur un aller-retour moyen vs voiture.</p>
              <svg viewBox="0 0 200 30" className="mt-3 h-8 w-full text-[#15803D]">
                <defs>
                  <linearGradient id="co2grad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#15803D" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#15803D" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M5 20 L40 20 L45 12 L55 12 L60 20 L120 20 L125 10 L140 10 L145 20 L195 20 L195 30 L5 30 Z" fill="url(#co2grad)" />
                <path d="M5 20 L40 20 L45 12 L55 12 L60 20 L120 20 L125 10 L140 10 L145 20 L195 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="150" cy="20" r="3.5" fill="currentColor">
                  <animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>

            <ForecastCard />

            <div className="group rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-sm font-bold text-ink">Pourquoi le train ?</div>
              <ul className="mt-3 space-y-2.5 text-sm text-ink">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803D] dark:bg-emerald-500/15">
                    <Icon name="leaf" className="h-3.5 w-3.5" />
                  </span>
                  <span>
                    <AnimatedNumber value={91} suffix=" %" className="font-bold text-ink" /> de CO₂ en moins qu'en voiture
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803D] dark:bg-emerald-500/15">
                    <Icon name="train" className="h-3.5 w-3.5" />
                  </span>
                  <span>Gares au cœur des villes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#15803D] dark:bg-emerald-500/15">
                    <Icon name="star" className="h-3.5 w-3.5" />
                  </span>
                  <span>Confort, paysages, temps pour soi</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <style>{`@keyframes heroin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </section>

      {/* Inspirations avec vraies photos */}
      <section className="mx-auto max-w-page px-4 pt-14 sm:px-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-ink">Inspirations pour vous</h2>
          <p className="mt-1 text-sm text-muted">Trouvez le voyage qui vous ressemble.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {INSPIRATIONS.map((c, i) => (
            <InspirationCard
              key={c.key}
              item={c}
              delay={i * 60}
              onClick={() => navigate(`/destinations?q=${c.key}`)}
            />
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
            className="group inline-flex items-center gap-1 text-sm font-semibold text-[#15803D] hover:underline"
          >
            Tout voir
            <Icon name="chevronRight" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dests.map((d, i) => (
              <div key={d.nom_gare} style={{ animation: `wxfadein .6s ease-out ${i * 70}ms both` }}>
                <DestinationCard dest={d} />
              </div>
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
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </div>
      </section>
    </div>
  )
}
