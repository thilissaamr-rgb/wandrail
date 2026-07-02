import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'
import CategoryChips from '../components/CategoryChips'
import ProfilCard from '../components/ProfilCard'
import { HERO_IMAGE } from '../lib/images'

const PROFILS = [
  { nom: 'Famille', desc: 'Parcs, activités enfants, nature, grands espaces' },
  { nom: 'Solo', desc: 'Culture, patrimoine, aventure en liberté' },
  { nom: 'Couple', desc: 'Gastronomie, charme, romantisme, détente' },
  { nom: 'Groupe', desc: 'Sport, événements, animation, plaisir collectif' },
  { nom: 'Eco', desc: 'Nature, mobilité douce, empreinte minimale' },
]

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
      .destinations({ limit: 9 })
      .then(setDests)
      .catch(() => setDests([]))
      .finally(() => setLoading(false))
  }, [])

  const search = () => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (dep) params.set('departement', dep)
    const qs = params.toString()
    navigate(`/destinations${qs ? `?${qs}` : ''}`)
  }

  return (
    <div>
      {/* HERO v2 : texte a gauche + image train a droite (style maquette) */}
      <section className="border-b border-line bg-card">
        <div className="mx-auto grid max-w-page grid-cols-1 gap-10 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:items-center">
          {/* Colonne gauche : texte + recherche */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-eco-soft px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-eco-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-eco" />
              Plateforme data & IA
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-6xl">
              Le tourisme en train,
              <br />
              <span className="text-eco">autrement.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
              Découvrez des destinations accessibles en train, plus durables et moins connues.
            </p>

            {/* Barre de recherche */}
            <div className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-line bg-card p-2 shadow-lg sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 px-3">
                <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  placeholder="Où souhaitez-vous partir ?"
                  className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </div>
              <button
                onClick={search}
                className="h-11 rounded-xl bg-eco px-7 text-sm font-semibold text-white transition hover:bg-eco-dark"
              >
                Rechercher
              </button>
            </div>

            {/* Stats horizontales */}
            {stats && (
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-eco-soft text-eco">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1z" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-lg font-black text-ink">+{stats.nb_lieux?.toLocaleString('fr-FR')}</div>
                    <div className="text-xs text-muted">Destinations</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-eco-soft text-eco">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <rect x="4" y="4" width="16" height="13" rx="3" />
                      <path d="M4 11h16M8.5 20l-1.5 2M15.5 20l1.5 2" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-lg font-black text-ink">+{stats.nb_gares}</div>
                    <div className="text-xs text-muted">Gares connectées</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-eco-soft text-eco">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                    </svg>
                  </span>
                  <div>
                    <div className="text-lg font-black text-eco">-{stats.co2_vs_voiture_pct}%</div>
                    <div className="text-xs text-muted">CO₂ vs voiture</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite : image du hero + carte impact flottante */}
          <div className="relative hidden md:block">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl">
              <img
                src={HERO_IMAGE}
                alt="Train dans les paysages français"
                className="h-[420px] w-full object-cover"
              />
            </div>
            {/* Carte flottante : impact CO2 */}
            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-line bg-card p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-eco-soft text-eco">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
                  </svg>
                </span>
                <div>
                  <div className="text-[0.62rem] font-bold uppercase tracking-wide text-muted">Impact CO₂ évité</div>
                  <div className="text-2xl font-black tracking-tight text-ink">2,4 t</div>
                  <div className="text-[0.65rem] text-muted">économisées cette semaine par la communauté</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profils */}
      <section className="bg-card2 px-6 py-14">
        <div className="mx-auto max-w-page">
          <h2 className="text-3xl font-black tracking-tighter text-ink">
            Quel type de voyageur êtes-vous ?
          </h2>
          <p className="mb-8 mt-1 text-sm text-muted">
            Votre profil - des recommandations sur mesure
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {PROFILS.map((p) => (
              <ProfilCard key={p.nom} nom={p.nom} desc={p.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* Filtres rapides par departement */}
      <CategoryChips
        items={[
          { label: 'Toutes les destinations', value: null },
          ...deps.map((d) => ({ label: d, value: d })),
        ]}
        active={null}
        onSelect={(v) =>
          navigate(`/destinations${v ? `?departement=${encodeURIComponent(v)}` : ''}`)
        }
      />

      {/* Destinations */}
      <section className="mx-auto max-w-page px-6 py-14">
        <div className="mb-9 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-ink">
              Destinations incontournables
            </h2>
            <p className="mt-1 text-sm text-muted">
              Sélectionnées pour vous - attractivité + accessibilité ferroviaire
            </p>
          </div>
          <button
            onClick={() => navigate('/destinations')}
            className="whitespace-nowrap text-sm font-bold text-violet hover:underline"
          >
            Voir tout &rarr;
          </button>
        </div>

        {loading ? (
          <SkeletonGrid count={9} />
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
