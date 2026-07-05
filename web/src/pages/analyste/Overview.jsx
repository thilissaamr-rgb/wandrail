import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Icon from '../../components/Icon'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

// Ratios officiels
const CO2_G_PER_KM_CAR = 218      // ADEME voiture
const CO2_G_PER_KM_TRAIN = 20     // TER moyenne
const CO2_KG_PER_TREE_PER_YEAR = 22  // 1 arbre absorbe ~22 kg CO2/an

export default function AnalystOverview() {
  const [stats, setStats] = useState(null)
  const [decision, setDecision] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    Promise.all([
      api.stats().catch(() => null),
      (api.analystDecision ? api.analystDecision() : api.get?.('/api/analyste/decision') || Promise.resolve(null)).catch(() => null),
    ]).then(([s, d]) => {
      setStats(s)
      setDecision(d)
      if (!s) setErr(true)
    })
  }, [])

  if (err) return <ErrorState />
  if (!stats) return <SkeletonImpact />

  // Scenario : impact si 1 million de voyageurs font 1 trajet moyen (415 km AR)
  const nbTrajets = 1_000_000
  const distMoyenne = decision?.km_moyen_par_trajet || 415
  const co2EviteKg = (nbTrajets * distMoyenne * (CO2_G_PER_KM_CAR - CO2_G_PER_KM_TRAIN)) / 1000
  const co2EviteTonnes = co2EviteKg / 1000
  const arbresEquivalents = Math.round(co2EviteKg / CO2_KG_PER_TREE_PER_YEAR)
  const kmEvites = nbTrajets * distMoyenne
  const eurosEconomises = kmEvites * 0.12

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      {/* HERO IMPACT */}
      <section className="overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-eco/5 via-card to-emerald-50 p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-eco">
              <Icon name="leaf" className="h-3.5 w-3.5" />
              Impact potentiel
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-6xl font-black tracking-tighter text-eco md:text-7xl">
                <AnimatedNumber value={co2EviteTonnes} />
              </div>
              <div className="pb-3 text-2xl font-bold text-muted">tonnes</div>
            </div>
            <div className="mt-2 text-lg font-semibold text-ink">
              de CO₂ évitées chaque année
            </div>
            <p className="mt-3 max-w-md text-sm text-muted">
              Si {fmt(nbTrajets)} personnes remplacent leur trajet voiture par le train
              via Wandrail chaque année.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <TreeVisual count={5} />
            <div className="mt-4 text-center">
              <div className="text-4xl font-black text-emerald-600">
                <AnimatedNumber value={arbresEquivalents} />
              </div>
              <div className="text-sm font-medium text-muted">arbres plantés équivalents</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 KPI secondaires */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon="train"
          color="#0A5C36"
          value={fmt(Math.round(kmEvites / 1_000_000))}
          unit="M km"
          label="parcourus en train"
          sub="au lieu de la voiture"
        />
        <KpiCard
          icon="euro"
          color="#1F6FEB"
          value={fmt(Math.round(eurosEconomises / 1_000_000))}
          unit="M€"
          label="économisés par les voyageurs"
          sub="carburant + entretien évités"
        />
        <KpiCard
          icon="pin"
          color="#E76F51"
          value={fmt(stats.nb_gares)}
          unit="gares"
          label="couvertes en France"
          sub={`${fmt(stats.nb_lieux)} lieux référencés`}
        />
      </div>

      {/* Comparaison train vs voiture */}
      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">Train vs Voiture</h2>
            <p className="mt-1 text-xs text-muted">
              Pour un trajet moyen de {Math.round(distMoyenne)} km
            </p>
          </div>
          <span className="rounded-full bg-eco/10 px-3 py-1 text-xs font-bold text-eco">
            -91% CO₂
          </span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <CompareBar
            label="Train"
            value={Math.round(distMoyenne * CO2_G_PER_KM_TRAIN / 1000)}
            max={Math.round(distMoyenne * CO2_G_PER_KM_CAR / 1000)}
            unit="kg CO₂"
            color="#0A5C36"
            icon="train"
          />
          <CompareBar
            label="Voiture"
            value={Math.round(distMoyenne * CO2_G_PER_KM_CAR / 1000)}
            max={Math.round(distMoyenne * CO2_G_PER_KM_CAR / 1000)}
            unit="kg CO₂"
            color="#E76F51"
            icon="pin"
          />
        </div>
      </section>

      {/* Top destinations */}
      {decision?.top_destinations && (
        <section className="mt-8 rounded-2xl border border-line bg-card p-6">
          <h2 className="text-lg font-black text-ink">Top 5 destinations recommandées</h2>
          <p className="mt-1 text-xs text-muted">Score d'attractivité et richesse en activités</p>
          <div className="mt-6 space-y-4">
            {decision.top_destinations.slice(0, 5).map((d, i) => (
              <TopBar
                key={d.commune || d.nom_gare || i}
                rank={i + 1}
                name={d.commune || d.nom_gare}
                score={d.score || d.score_attractivite}
                pois={d.nb_poi || d.nb_poi_5km}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Composants graphiques ────────────────────────────

function AnimatedNumber({ value }) {
  // Animation par steps courts. Compte visible de 0 -> value.
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const target = Number(value) || 0
    if (!target) { setDisplay(0); return }
    const duration = 1200
    const steps = 30
    const stepDuration = duration / steps
    let current = 0
    const id = setInterval(() => {
      current += 1
      const t = current / steps
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(target * eased))
      if (current >= steps) clearInterval(id)
    }, stepDuration)
    return () => clearInterval(id)
  }, [value])
  return <>{display.toLocaleString('fr-FR')}</>
}

function TreeVisual({ count = 5 }) {
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 40 60"
          className="h-16 w-10"
          style={{ animation: `treeGrow 0.6s ${i * 0.1}s both` }}
        >
          <path d="M20 60 L20 40" stroke="#8b5a3c" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 5 C10 15, 8 30, 20 42 C32 30, 30 15, 20 5 Z" fill="#0A5C36" />
          <circle cx="18" cy="18" r="2" fill="#22C55E" opacity="0.5" />
          <circle cx="24" cy="25" r="1.5" fill="#22C55E" opacity="0.5" />
        </svg>
      ))}
      <style>{`
        @keyframes treeGrow {
          from { transform: translateY(20px) scale(0.6); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function KpiCard({ icon, color, value, unit, label, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: color + '15', color }}
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <div className="text-3xl font-black tracking-tight text-ink">{value}</div>
        <div className="text-sm font-semibold text-muted">{unit}</div>
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{label}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </div>
  )
}

function CompareBar({ label, value, max, unit, color, icon }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="rounded-xl border border-line bg-card2 p-5">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="h-4 w-4" style={{ color }} />
        <div className="text-sm font-bold text-ink">{label}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <div className="text-3xl font-black" style={{ color }}>
          <AnimatedNumber value={value} />
        </div>
        <div className="text-xs font-semibold text-muted">{unit}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full transition-all duration-[1200ms]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function TopBar({ rank, name, score, pois }) {
  const scorePct = Math.min(100, (Number(score) || 0) * 10)
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-eco/10 text-sm font-black text-eco">
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-sm font-bold text-ink">
            {String(name || '').replace(/\b\w/g, (c) => c.toUpperCase())}
          </div>
          <div className="flex-shrink-0 text-xs font-semibold text-muted">
            {fmt(pois)} activités
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-card2">
          <div
            className="h-full rounded-full bg-eco transition-all duration-1000"
            style={{ width: `${scorePct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function SkeletonImpact() {
  return (
    <div className="mx-auto max-w-page animate-pulse px-6 py-8">
      <div className="h-64 rounded-3xl bg-card2" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((k) => (
          <div key={k} className="h-40 rounded-2xl bg-card2" />
        ))}
      </div>
      <div className="mt-8 h-72 rounded-2xl bg-card2" />
    </div>
  )
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-page px-6 py-24 text-center">
      <Icon name="x" className="mx-auto h-10 w-10 text-muted" />
      <div className="mt-4 text-lg font-semibold text-ink">Données indisponibles</div>
    </div>
  )
}
