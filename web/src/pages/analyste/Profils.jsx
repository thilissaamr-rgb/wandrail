import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

// Onglet Profils : cinq profils voyageurs, leurs top destinations + affinites categories.
const PROFILS = [
  { key: 'Solo', icon: 'user', color: DATAVIZ.train, dominance: { Culture: 90, Patrimoine: 80, Restauration: 60, Nature: 45, Loisirs: 30 } },
  { key: 'Couple', icon: 'heart', color: DATAVIZ.pink, dominance: { Restauration: 90, Hebergement: 80, Culture: 65, Nature: 55, Patrimoine: 50 } },
  { key: 'Famille', icon: 'users', color: DATAVIZ.gold, dominance: { Loisirs: 95, Nature: 80, Hebergement: 70, Patrimoine: 45, Culture: 40 } },
  { key: 'Entre amis', icon: 'star', color: DATAVIZ.eco, dominance: { Loisirs: 85, Restauration: 75, Culture: 55, Nature: 65, Hebergement: 80 } },
  { key: 'Senior', icon: 'castle', color: DATAVIZ.purple, dominance: { Patrimoine: 95, Culture: 85, Nature: 70, Restauration: 60, Hebergement: 55 } },
]

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')
const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function Profils() {
  const [byProfile, setByProfile] = useState({})

  useEffect(() => {
    Promise.all(
      PROFILS.map((p) =>
        api.recommandations(p.key).then((r) => [p.key, r]).catch(() => [p.key, []]),
      ),
    ).then((entries) => {
      const map = {}
      entries.forEach(([k, v]) => { map[k] = v })
      setByProfile(map)
    })
  }, [])

  // Prepare data pour RadarChart comparatif (categories x profils)
  const radarData = useMemo(() => {
    const cats = ['Culture', 'Patrimoine', 'Restauration', 'Nature', 'Loisirs', 'Hebergement']
    return cats.map((cat) => {
      const row = { categorie: cat.replace('_', '-') }
      for (const p of PROFILS) {
        row[p.key] = p.dominance[cat] || 0
      }
      return row
    })
  }, [])

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-eco">
          <Icon name="users" className="h-3.5 w-3.5" />
          Profils voyageurs
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          Cinq profils, cinq façons de voyager
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Le modèle KNN cosinus produit un top 5 destinations personnalisé pour chaque profil éditorial.
          Comparaison des affinités catégories via radar, top destinations par profil.
        </p>
      </div>

      {/* Radar comparatif catégories × profils */}
      <div className="mt-8">
        <ChartCard
          title="Affinités par catégorie touristique"
          subtitle="Score d'attirance normalisé pour chaque catégorie, par profil voyageur"
          badge="5 profils"
          icon="star"
          height={420}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke={GRID_COLOR} />
              <PolarAngleAxis dataKey="categorie" tick={{ fill: AXIS_COLOR, fontSize: 11, fontWeight: 700 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: AXIS_COLOR, fontSize: 9 }} tickCount={5} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              {PROFILS.map((p) => (
                <Radar
                  key={p.key}
                  name={p.key}
                  dataKey={p.key}
                  stroke={p.color}
                  fill={p.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cards profils avec top 5 */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROFILS.map((p) => {
          const recos = byProfile[p.key] || []
          return (
            <div
              key={p.key}
              className="group relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-30 transition-opacity group-hover:opacity-50"
                style={{ background: `radial-gradient(circle at 100% 0%, ${p.color}22 0%, transparent 60%)` }}
              />
              <div className="relative flex items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
                  style={{ background: p.color }}
                >
                  <Icon name={p.icon} className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-lg font-black tracking-tight text-ink">{p.key}</div>
                  <div className="text-xs text-muted">{recos.length} recommandations ML</div>
                </div>
              </div>

              <div className="relative mt-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted">Catégories dominantes</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(p.dominance)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([c, v]) => (
                      <span
                        key={c}
                        className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: p.color }}
                      >
                        {c.replace('_', '-')} {v}
                      </span>
                    ))}
                </div>
              </div>

              <div className="relative mt-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-muted">Top 5 destinations</div>
                <ol className="mt-2 space-y-1.5 text-xs">
                  {recos.slice(0, 5).map((r, i) => (
                    <li key={r.nom_gare || i} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: p.color }}>
                        {i + 1}
                      </span>
                      <span className="truncate font-semibold text-ink">
                        {cap(r.commune || r.nom_gare || '')}
                      </span>
                      <span className="ml-auto rounded bg-card2 px-1.5 py-0.5 text-[10px] font-black text-ink">
                        {Number(r.score_reco || 0).toFixed(1)}
                      </span>
                    </li>
                  ))}
                  {recos.length === 0 && <li className="text-muted">Chargement…</li>}
                </ol>
              </div>
            </div>
          )
        })}
      </div>

      {/* Insight */}
      <div className="mt-6 rounded-2xl border border-line bg-card2/70 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-eco text-white">
            <Icon name="users" className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-black uppercase tracking-wider text-ink">Lecture stratégique</div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Les profils <strong className="text-ink">Famille</strong> et <strong className="text-ink">Entre amis</strong> convergent
              vers des destinations riches en activités (Loisirs, Sport). <strong className="text-ink">Solo</strong> et
              <strong className="text-ink"> Senior</strong> privilégient Culture et Patrimoine. <strong className="text-ink">Couple</strong> se
              distingue par la Gastronomie et le Bien-être — les recommandations KNN reflètent bien ces divergences.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
