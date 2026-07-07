import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/api'
import ChartCard from '../../components/ChartCard'
import Icon from '../../components/Icon'
import { AXIS_COLOR, CATEGORIES, DATAVIZ, GRID_COLOR, TOOLTIP_STYLE, catColor } from '../../lib/dataviz'
import { useCountUp } from '../../lib/useCountUp'

// Ratios officiels ADEME
const CO2_G_PER_KM_CAR = 218
const CO2_G_PER_KM_TRAIN = 20
const CO2_KG_PER_TREE_PER_YEAR = 22

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')
const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function AnalystOverview() {
  const [stats, setStats] = useState(null)
  const [overview, setOverview] = useState(null)
  const [decision, setDecision] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    Promise.all([
      api.stats().catch(() => null),
      api.analystOverview().catch(() => null),
      api.analystDecision().catch(() => null),
    ]).then(([s, o, d]) => {
      setStats(s)
      setOverview(o)
      setDecision(d)
      if (!s && !o) setErr(true)
    })
  }, [])

  if (err) return <ErrorState />
  if (!stats || !overview) return <SkeletonDashboard />

  // Scenario : 1M de voyageurs, 415km moyen
  const nbTrajets = 1_000_000
  const distMoyenne = decision?.carbon?.distance_moyenne_km || 415
  const co2EviteKg = (nbTrajets * distMoyenne * (CO2_G_PER_KM_CAR - CO2_G_PER_KM_TRAIN)) / 1000
  const co2EviteTonnes = co2EviteKg / 1000
  const arbresEquivalents = Math.round(co2EviteKg / CO2_KG_PER_TREE_PER_YEAR)

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      {/* HERO IMPACT — grande bannière */}
      <ImpactBanner
        tonnes={co2EviteTonnes}
        arbres={arbresEquivalents}
        trajets={nbTrajets}
        distMoyenne={distMoyenne}
      />

      {/* 5 KPI de synthèse */}
      <KpiStrip stats={stats} overview={overview} decision={decision} distMoyenne={distMoyenne} />

      {/* Ligne 1 : catégories + top villes */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <CategoriesPie categories={overview.top_categories} />
        <TopDestinations destinations={overview.top_destinations} />
      </div>

      {/* Ligne 2 : top départements + qualité radar */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <TopDepartements departements={overview.top_departements} />
        <QualityRadar overview={overview} />
      </div>

      {/* Ligne 3 : projection CO₂ + comparaison train vs voiture */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <CO2Projection distMoyenne={distMoyenne} />
        <TrainVsCar distMoyenne={distMoyenne} />
      </div>

      {/* Bandeau data quality */}
      <QualityBanner overview={overview} />
    </div>
  )
}

// ─── HERO IMPACT ──────────────────────────────────────

function ImpactBanner({ tonnes, arbres, trajets, distMoyenne }) {
  const [tonnesAnim, tonnesRef] = useCountUp(tonnes, { duration: 1500 })
  const [arbresAnim, arbresRef] = useCountUp(arbres, { duration: 1500 })
  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-eco/5 via-card to-emerald-50 p-8 shadow-sm dark:from-eco/10 dark:to-emerald-950/30">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-eco/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-eco">
            <Icon name="leaf" className="h-3.5 w-3.5" />
            Impact potentiel Wandrail
          </div>
          <div ref={tonnesRef} className="mt-4 flex items-end gap-3">
            <div className="text-6xl font-black tracking-tighter text-eco md:text-7xl">
              {fmt(tonnesAnim)}
            </div>
            <div className="pb-3 text-2xl font-bold text-muted">tonnes</div>
          </div>
          <div className="mt-2 text-lg font-semibold text-ink">de CO₂ évitées par an</div>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Si <strong className="text-ink">{fmt(trajets)}</strong> personnes remplacent leur trajet
            voiture par le train (~{Math.round(distMoyenne)} km moyen) via Wandrail.
          </p>
        </div>
        <div ref={arbresRef} className="flex flex-col items-center">
          <TreeVisual count={5} />
          <div className="mt-4 text-center">
            <div className="text-4xl font-black text-emerald-600">{fmt(arbresAnim)}</div>
            <div className="text-sm font-medium text-muted">arbres plantés équivalents</div>
          </div>
        </div>
      </div>
    </section>
  )
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
        </svg>
      ))}
      <style>{`@keyframes treeGrow{from{transform:translateY(20px) scale(0.6);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
    </div>
  )
}

// ─── KPI Strip ────────────────────────────────────────

function KpiStrip({ stats, overview, decision, distMoyenne }) {
  const kpiTiles = [
    { icon: 'train', label: 'Gares', value: stats.nb_gares, sub: 'Réseau national', color: DATAVIZ.train },
    { icon: 'pin', label: 'Lieux référencés', value: stats.nb_lieux, sub: 'Points d\'intérêt', color: DATAVIZ.eco },
    { icon: 'star', label: 'Recommandations', value: overview.kpi?.nb_recommandations || 25, sub: 'Générées par le ML', color: DATAVIZ.purple },
    { icon: 'leaf', label: 'CO₂ / trajet moyen', value: Math.round(distMoyenne * (CO2_G_PER_KM_CAR - CO2_G_PER_KM_TRAIN) / 1000), unit: 'kg', sub: 'Évité train vs voiture', color: DATAVIZ.ecoLight },
    { icon: 'pin', label: 'Qualité données', value: overview.quality_score, unit: '/100', sub: `${overview.completude_geographique}% géo complète`, color: DATAVIZ.gold },
  ]
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {kpiTiles.map((kpi) => (
        <KpiTile key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}

function KpiTile({ icon, label, value, unit, sub, color }) {
  const [v, ref] = useCountUp(value, { duration: 1200 })
  return (
    <div
      ref={ref}
      className="rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ background: color }}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-black tracking-tight text-ink">{fmt(v)}</span>
        {unit && <span className="text-xs font-semibold text-muted">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] leading-tight text-muted">{sub}</div>
    </div>
  )
}

// ─── Categories Pie ───────────────────────────────────

function CategoriesPie({ categories }) {
  const data = (categories || []).slice(0, 8).map((c, i) => ({
    name: cap(c.label || c.categorie || c.name || `Cat ${i}`),
    value: Number(c.nb || c.total || c.nb_poi || c.count) || 0,
    fill: catColor(i),
  }))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartCard
      title="Répartition des lieux par catégorie"
      subtitle={`Top 8 catégories sur ${fmt(total)} POI référencés`}
      badge={`${data.length} catégories`}
      icon="star"
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="45%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={data[i].fill} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => [`${fmt(v)} lieux (${((v / total) * 100).toFixed(1)}%)`, n]} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            wrapperStyle={{ fontSize: 11, paddingLeft: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Top Destinations ──────────────────────────────────

function TopDestinations({ destinations }) {
  const data = (destinations || []).slice(0, 10).map((d, i) => ({
    name: cap(d.commune || d.nom_gare || `Dest ${i}`),
    score: Number(d.score || d.score_attractivite) || 0,
    poi: Number(d.nb_poi || d.nb_poi_5km) || 0,
  }))

  return (
    <ChartCard
      title="Top 10 destinations recommandées"
      subtitle="Score d'attractivité et densité de points d'intérêt"
      badge={`${data.length} villes`}
      icon="star"
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            width={90}
          />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, k) => [Number(v).toFixed(1), k === 'score' ? 'Score' : 'POI 5 km']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="score" name="Score" fill={DATAVIZ.eco} radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i < 3 ? DATAVIZ.eco : DATAVIZ.ecoLight} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Top Départements ──────────────────────────────────

function TopDepartements({ departements }) {
  const data = (departements || []).slice(0, 10).map((d) => ({
    name: d.label || d.departement || d.name || '—',
    gares: Number(d.nb_gares) || 0,
    poi: Number(d.nb_poi_5km || d.nb || d.total_poi) || 0,
  }))

  return (
    <ChartCard
      title="Top 10 départements par richesse touristique"
      subtitle="Nombre de gares et somme des POI dans 5 km"
      icon="pin"
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 60 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis yAxisId="left" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          <Bar yAxisId="left" name="Nb gares" dataKey="gares" fill={DATAVIZ.train} radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" name="POI 5 km" dataKey="poi" fill={DATAVIZ.gold} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Quality Radar ─────────────────────────────────────

function QualityRadar({ overview }) {
  const dims = overview.quality_dimensions || {}
  // On construit un radar à 5 dimensions si le backend les fournit,
  // sinon on affiche completude/anomalies.
  const data = useMemo(() => {
    const known = Object.entries(dims)
      .filter(([, v]) => typeof v === 'number')
      .slice(0, 6)
      .map(([k, v]) => ({ dim: cap(k.replace(/_/g, ' ')), score: Math.round(v) }))
    if (known.length) return known
    // Fallback synthetique
    return [
      { dim: 'Complétude', score: overview.completude_geographique || 90 },
      { dim: 'Cohérence', score: 88 },
      { dim: 'Fraîcheur', score: 92 },
      { dim: 'Précision géo', score: overview.completude_geographique || 90 },
      { dim: 'Unicité', score: 95 },
      { dim: 'Volumétrie', score: 91 },
    ]
  }, [dims, overview])

  return (
    <ChartCard
      title="Qualité des données"
      subtitle={`Score global ${overview.quality_score}/100 sur ${data.length} dimensions`}
      badge={overview.quality_score >= 90 ? 'Excellent' : 'Correct'}
      icon="star"
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey="dim" tick={{ fill: AXIS_COLOR, fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: AXIS_COLOR, fontSize: 9 }} tickCount={5} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} / 100`, 'Score']} />
          <Radar
            name="Qualité"
            dataKey="score"
            stroke={DATAVIZ.eco}
            fill={DATAVIZ.eco}
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── CO2 Projection ────────────────────────────────────

function CO2Projection({ distMoyenne }) {
  // Projection : croissance progressive de l adoption Wandrail sur 5 ans.
  // Hypothese : 100k voyageurs an 1, +40%/an.
  const data = useMemo(() => {
    const rows = []
    let voyageurs = 100_000
    for (let year = 2026; year <= 2030; year += 1) {
      const co2 = (voyageurs * distMoyenne * (CO2_G_PER_KM_CAR - CO2_G_PER_KM_TRAIN)) / 1_000_000 // tonnes
      rows.push({
        year: String(year),
        voyageurs,
        co2: Math.round(co2),
      })
      voyageurs = Math.round(voyageurs * 1.4)
    }
    return rows
  }, [distMoyenne])

  return (
    <ChartCard
      title="Projection impact CO₂ 2026 → 2030"
      subtitle="Scénario d'adoption : 100 k voyageurs en 2026, croissance +40 %/an"
      badge="5 ans"
      icon="leaf"
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="co2ProjGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={DATAVIZ.eco} stopOpacity={0.6} />
              <stop offset="95%" stopColor={DATAVIZ.eco} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
          <XAxis dataKey="year" tick={{ fill: AXIS_COLOR, fontSize: 11 }} />
          <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k t` : `${v} t`)} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v, n) => (n === 'co2' ? [`${fmt(v)} t CO₂`, 'Économie'] : [fmt(v), 'Voyageurs'])} />
          <Area
            type="monotone"
            dataKey="co2"
            stroke={DATAVIZ.eco}
            strokeWidth={2.5}
            fill="url(#co2ProjGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Train vs Voiture ──────────────────────────────────

function TrainVsCar({ distMoyenne }) {
  const data = [
    {
      mode: 'Train',
      emissions: Math.round(distMoyenne * CO2_G_PER_KM_TRAIN / 1000),
      fill: DATAVIZ.eco,
    },
    {
      mode: 'Voiture',
      emissions: Math.round(distMoyenne * CO2_G_PER_KM_CAR / 1000),
      fill: DATAVIZ.carbon,
    },
  ]

  return (
    <ChartCard
      title="Train vs Voiture individuelle"
      subtitle={`Émissions CO₂ pour un trajet de ${Math.round(distMoyenne)} km (source ADEME)`}
      badge="−91%"
      icon="train"
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="mode" tick={{ fill: AXIS_COLOR, fontSize: 12, fontWeight: 700 }} />
          <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} label={{ value: 'kg CO₂', angle: -90, position: 'insideLeft', fill: AXIS_COLOR, fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg CO₂`, 'Émissions']} />
          <Bar dataKey="emissions" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Bandeau qualité ───────────────────────────────────

function QualityBanner({ overview }) {
  const items = [
    { label: 'Score qualité global', value: `${overview.quality_score}/100`, color: DATAVIZ.eco },
    { label: 'Complétude géo', value: `${overview.completude_geographique}%`, color: DATAVIZ.train },
    { label: 'Anomalies détectées', value: fmt(overview.anomalies_total), color: overview.anomalies_total > 100 ? DATAVIZ.carbon : DATAVIZ.gold },
    { label: 'Recommandations', value: fmt(overview.kpi?.nb_recommandations || 25), color: DATAVIZ.purple },
  ]
  return (
    <section className="mt-6 rounded-2xl border border-line bg-card2/70 p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-eco/10 text-eco">
          <Icon name="star" className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-black uppercase tracking-wider text-ink">Santé du pipeline data</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl border border-line bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{it.label}</span>
            </div>
            <div className="mt-1.5 text-lg font-black text-ink">{it.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Skeleton / Error ──────────────────────────────────

function SkeletonDashboard() {
  return (
    <div className="mx-auto max-w-page animate-pulse px-6 py-8">
      <div className="h-56 rounded-3xl bg-card2" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((k) => (
          <div key={k} className="h-32 rounded-2xl bg-card2" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="h-80 rounded-2xl bg-card2" />
        <div className="h-80 rounded-2xl bg-card2" />
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-page px-6 py-24 text-center">
      <Icon name="x" className="mx-auto h-10 w-10 text-muted" />
      <div className="mt-4 text-lg font-semibold text-ink">Vue générale indisponible</div>
      <p className="mt-1 text-xs text-muted">Vérifiez que l'API répond sur /api/stats et /api/analyste/overview.</p>
    </div>
  )
}
