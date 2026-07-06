import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../../lib/api'
import ChartCard from '../../components/ChartCard'
import Icon from '../../components/Icon'
import { AXIS_COLOR, CATEGORIES, DATAVIZ, GRID_COLOR, TOOLTIP_STYLE, catColor } from '../../lib/dataviz'

// Onglet Tourisme : quelles categories, quels departements, quelles destinations
// concentrent l'offre touristique. Coherent avec les autres onglets Analyste.
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')
const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function Tourisme() {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.analystOverview().then(setData).catch(() => setData(null))
  }, [])

  if (!data) return <Skeleton />

  const cats = (data.top_categories || []).slice(0, 8).map((c, i) => ({
    name: cap(c.categorie || c.name || `Cat ${i}`),
    value: Number(c.nb_poi || c.count || c.total) || 0,
    fill: catColor(i),
  }))
  const deps = (data.top_departements || []).slice(0, 10).map((d) => ({
    name: d.departement || d.name || '—',
    poi: Number(d.nb_poi || d.nb_poi_5km || d.count || d.total_poi) || 0,
    gares: Number(d.nb_gares) || 0,
  }))
  const dests = (data.top_destinations || []).slice(0, 10).map((d) => ({
    name: cap(d.commune || d.nom_gare || ''),
    poi: Number(d.nb_poi_5km || d.nb_poi) || 0,
    score: Number(d.score_attractivite || d.score) || 0,
  }))
  const totalCat = cats.reduce((s, c) => s + c.value, 0)

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-eco">
          <Icon name="star" className="h-3.5 w-3.5" />
          Tourisme
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Où se concentre l'offre touristique
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Catégories dominantes, départements les plus riches, destinations les mieux
          dotées en points d'intérêt à proximité des gares.
        </p>
      </div>

      {/* KPI top */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="POI touristiques" value={data.kpi?.poi_count} sub="Recensés en Silver" color={DATAVIZ.eco} icon="pin" />
        <Kpi label="Gares desservies" value={data.kpi?.gares_count} sub="Points d'accès" color={DATAVIZ.train} icon="train" />
        <Kpi label="Départements" value={deps.length} sub="Couverture" color={DATAVIZ.gold} icon="pin" />
        <Kpi label="Catégories POI" value={cats.length} sub="Taxonomie DATAtourisme" color={DATAVIZ.purple} icon="star" />
      </div>

      {/* Ligne 1 : PieChart catégories + BarChart top destinations */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <ChartCard
          title="Répartition par catégorie"
          subtitle={`Top 8 catégories sur ${fmt(totalCat)} POI`}
          icon="star"
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cats}
                dataKey="value"
                nameKey="name"
                cx="45%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={2}
                labelLine={false}
              >
                {cats.map((_, i) => (
                  <Cell key={i} fill={cats[i].fill} />
                ))}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, n) => [`${fmt(v)} lieux (${((v / totalCat) * 100).toFixed(1)}%)`, n]}
              />
              <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: 11, paddingLeft: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Top 10 destinations les plus riches"
          subtitle="Nombre de POI à moins de 5 km de la gare"
          badge={`${dests.length} villes`}
          icon="pin"
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dests} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 10 }} width={90} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [fmt(v), 'POI 5 km']} />
              <Bar dataKey="poi" radius={[0, 6, 6, 0]}>
                {dests.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? DATAVIZ.eco : DATAVIZ.ecoLight} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Ligne 2 : BarChart départements double axe */}
      <div className="mt-6">
        <ChartCard
          title="Top 10 départements par richesse touristique"
          subtitle="Comparaison POI (barres bleues) et nombre de gares (barres vertes)"
          icon="pin"
          height={360}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deps} margin={{ top: 10, right: 12, left: -10, bottom: 60 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: AXIS_COLOR, fontSize: 10 }} angle={-35} textAnchor="end" height={70} interval={0} />
              <YAxis yAxisId="left" tick={{ fill: AXIS_COLOR, fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar yAxisId="left" name="POI 5 km" dataKey="poi" fill={DATAVIZ.train} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" name="Nb gares" dataKey="gares" fill={DATAVIZ.eco} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Insight */}
      {cats[0] && (
        <div className="mt-6 rounded-2xl border border-line bg-card2/70 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-eco text-white">
              <Icon name="star" className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-black uppercase tracking-wider text-ink">Lecture stratégique</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                La catégorie <strong className="text-ink">{cats[0].name}</strong> domine avec <strong className="text-ink">{fmt(cats[0].value)}</strong> lieux
                ({((cats[0].value / totalCat) * 100).toFixed(0)}% du total). Le département <strong className="text-ink">{deps[0]?.name || '—'}</strong> concentre le plus de POI à proximité de gare.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, color, icon }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: color }}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-ink">{fmt(value)}</div>
      <div className="mt-1 text-xs text-muted">{sub}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-page animate-pulse px-6 py-8">
      <div className="h-24 w-2/3 rounded-2xl bg-card2" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (<div key={k} className="h-32 rounded-2xl bg-card2" />))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {[0, 1].map((k) => (<div key={k} className="h-80 rounded-2xl bg-card2" />))}
      </div>
    </div>
  )
}
