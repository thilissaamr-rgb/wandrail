import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { api } from '../../lib/api'
import ChartCard from '../../components/ChartCard'
import Icon from '../../components/Icon'
import { AXIS_COLOR, DATAVIZ, GRID_COLOR, TOOLTIP_STYLE, catColor } from '../../lib/dataviz'

// Page Territoires : synthese decisionnelle par region / departement / gare.
// Refonte 2026-07-06 :
// - Palette tokens (bg-card, text-ink, border-line) au lieu de slate-950 isole
// - Vrais graphes Recharts (scatter potentiel / opportunite, bar departements)
// - Insights recentres sur decisions actionables

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')
const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function AnalystDecision() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.analystDecision().then(setData).catch(() => setError(true))
  }, [])

  if (error) return <ErrorState />
  if (!data) return <Skeleton />

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      {/* En-tete */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-eco">
          <Icon name="pin" className="h-3.5 w-3.5" />
          Territoires
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Où agir, où valoriser, où investir l'effort éditorial.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Cette vue transforme les données en <strong className="text-ink">décisions
          lisibles</strong> : destinations à fort potentiel, gares sous-exploitées,
          départements à valoriser, argument carbone.
        </p>
      </div>

      {/* KPI header */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Distance moyenne"
          value={data.carbon.distance_moyenne_km}
          unit="km"
          sub="Scénario Gold"
          color={DATAVIZ.train}
          icon="train"
        />
        <Kpi
          label="CO₂ évité / trajet"
          value={data.carbon.economie_moyenne_kg_par_trajet}
          unit="kg"
          sub="Train vs voiture"
          color={DATAVIZ.eco}
          icon="leaf"
        />
        <Kpi
          label="Scénario 1 000 voyageurs"
          value={fmt(data.carbon.scenario_1000_voyageurs_kg)}
          unit="kg"
          sub="Économie projetée"
          color={DATAVIZ.gold}
          icon="star"
        />
        <Kpi
          label="Départements analysés"
          value={fmt(data.departments.length)}
          unit="dép."
          sub="Comparaison disponible"
          color={DATAVIZ.purple}
          icon="pin"
        />
      </div>

      {/* Scatter : potentiel × opportunité */}
      <div className="mt-6">
        <PotentialScatter data={data} />
      </div>

      {/* Départements + Lecture stratégique */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DepartmentsBar rows={data.departments.slice(0, 10)} />
        <StrategyPanel definitions={data.definitions} />
      </div>

      {/* Rangs POI riches / fragiles */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RankPanel
          title="Gares les plus riches en POI"
          subtitle="Vision d'attractivité brute autour des gares."
          rows={data.poi_rich}
          valueLabel="POI à 5 km"
          color={DATAVIZ.eco}
        />
        <RankPanel
          title="Gares les plus fragiles"
          subtitle="Peu de POI et score faible : zones à surveiller ou à compléter en données."
          rows={data.poi_sparse}
          valueLabel="POI à 5 km"
          color={DATAVIZ.carbon}
        />
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────

function Kpi({ label, value, unit, sub, color, icon }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
          style={{ background: color }}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-black tracking-tight text-ink">{value}</span>
        <span className="text-xs font-semibold text-muted">{unit}</span>
      </div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  )
}

// ─── Scatter potentiel × opportunité ──────────────────

function PotentialScatter({ data }) {
  // Chaque destination = un point (nb_poi_5km sur X, score sur Y).
  // Taille du point = nb_voyageurs si dispo.
  // Vert (fort_potentiel) vs orange (sous_exploitee).
  const highPot = (data.high_potential || []).map((d) => ({
    name: cap(d.commune || d.nom_gare),
    x: Number(d.nb_poi_5km) || 0,
    y: Number(d.score) || 0,
    z: Number(d.nb_voyageurs_annuel) || 100,
  }))
  const underused = (data.underused || []).map((d) => ({
    name: cap(d.commune || d.nom_gare),
    x: Number(d.nb_poi_5km) || 0,
    y: Number(d.score) || Number(d.indice_opportunite) || 0,
    z: Number(d.nb_voyageurs_annuel) || 100,
  }))

  return (
    <ChartCard
      title="Cartographie décisionnelle"
      subtitle="Chaque point = une destination. Abscisse = richesse en POI, ordonnée = score d'attractivité, taille = fréquentation. En haut à droite : à valoriser. En bas à droite : opportunités."
      badge={`${highPot.length + underused.length} points`}
      icon="pin"
      height={400}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" />
          <XAxis
            type="number"
            dataKey="x"
            name="POI 5 km"
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            label={{ value: 'Nb POI dans 5 km', position: 'insideBottom', offset: -15, fill: AXIS_COLOR, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Score"
            tick={{ fill: AXIS_COLOR, fontSize: 11 }}
            label={{ value: "Score d'attractivité", angle: -90, position: 'insideLeft', fill: AXIS_COLOR, fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 400]} name="Voyageurs" />
          <Tooltip
            {...TOOLTIP_STYLE}
            cursor={{ strokeDasharray: '3 3', stroke: AXIS_COLOR }}
            formatter={(v, k) => {
              if (k === 'x') return [fmt(v), 'POI 5 km']
              if (k === 'y') return [Number(v).toFixed(1), 'Score']
              if (k === 'z') return [fmt(v), 'Voyageurs/an']
              return [v, k]
            }}
            labelFormatter={() => ''}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          <Scatter name="Fort potentiel" data={highPot} fill={DATAVIZ.eco} fillOpacity={0.75} />
          <Scatter name="Sous-exploité" data={underused} fill={DATAVIZ.gold} fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Departments bar chart ────────────────────────────

function DepartmentsBar({ rows }) {
  const data = rows.map((r) => ({
    name: r.departement,
    score: Number(r.score_moyen) || 0,
    gares: Number(r.nb_gares) || 0,
  }))

  return (
    <ChartCard
      title="Top 10 départements à valoriser"
      subtitle="Équilibre entre maillage gare et score moyen d'attractivité."
      icon="star"
      height={400}
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
          <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
          <Bar name="Score moyen" dataKey="score" fill={DATAVIZ.train} radius={[6, 6, 0, 0]} />
          <Bar name="Nb gares" dataKey="gares" fill={DATAVIZ.eco} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ─── Panneau Insights ─────────────────────────────────

function StrategyPanel({ definitions }) {
  const items = [
    {
      icon: 'star',
      color: DATAVIZ.eco,
      text: "Les gares à fort potentiel montrent où l'offre touristique est déjà crédible pour l'expérience voyageur.",
    },
    {
      icon: 'pin',
      color: DATAVIZ.gold,
      text: 'Les opportunités sous-exploitées révèlent les lieux où une meilleure mise en avant peut produire un gain d\'usage rapide.',
    },
    {
      icon: 'train',
      color: DATAVIZ.train,
      text: 'La lecture départementale permet d\'argumenter une extension éditoriale, des campagnes locales ou des partenariats.',
    },
    {
      icon: 'leaf',
      color: DATAVIZ.ecoLight,
      text: definitions?.carbone || "Chaque trajet en train évite environ 91% des émissions vs voiture individuelle.",
    },
  ]
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
          <Icon name="star" className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-black uppercase tracking-wider text-ink">Lecture stratégique</h3>
      </div>
      <p className="mt-1 text-xs text-muted">Comment utiliser cette vue devant le jury ou un partenaire.</p>
      <div className="mt-4 space-y-3">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-line bg-card2 p-3"
            style={{ animation: `fadein 0.5s ease-out ${i * 100}ms both` }}
          >
            <span
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: it.color }}
            >
              <Icon name={it.icon} className="h-4 w-4" />
            </span>
            <p className="text-xs leading-relaxed text-ink">{it.text}</p>
          </div>
        ))}
      </div>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

// ─── Rank panel (POI riches / fragiles) ───────────────

function RankPanel({ title, subtitle, rows, valueLabel, color }) {
  const max = Math.max(...rows.map((r) => Number(r.nb_poi_5km) || 0), 1)
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
          style={{ background: color }}
        >
          <Icon name="pin" className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-black uppercase tracking-wider text-ink">{title}</h3>
      </div>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>
      <div className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const pct = Math.min(100, ((Number(row.nb_poi_5km) || 0) / max) * 100)
          return (
            <div
              key={row.nom_gare || index}
              className="flex items-center gap-3 rounded-xl border border-line bg-card2 p-3"
              style={{ animation: `fadein 0.5s ease-out ${index * 60}ms both` }}
            >
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ background: color }}
              >
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-sm font-bold text-ink">
                    {cap(row.commune || row.nom_gare)}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-black text-ink">{fmt(row.nb_poi_5km)}</div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-muted">{valueLabel}</div>
                  </div>
                </div>
                <div className="mt-1.5 text-[11px] text-muted">{row.departement}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card">
                  <div
                    className="h-full rounded-full transition-all duration-[1200ms]"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Loading / Error ──────────────────────────────────

function Skeleton() {
  return (
    <div className="mx-auto max-w-page animate-pulse px-6 py-10">
      <div className="h-24 w-2/3 rounded-2xl bg-card2" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="h-32 rounded-2xl bg-card2" />
        ))}
      </div>
      <div className="mt-6 h-96 rounded-2xl bg-card2" />
    </div>
  )
}

function ErrorState() {
  return (
    <div className="mx-auto max-w-page px-6 py-24 text-center">
      <Icon name="x" className="mx-auto h-10 w-10 text-muted" />
      <div className="mt-4 text-lg font-semibold text-ink">Données Territoires indisponibles</div>
    </div>
  )
}
