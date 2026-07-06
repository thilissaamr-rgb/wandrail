import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Icon from '../../components/Icon'

// Onglet Tourisme : quelles categories, quels departements, quelles destinations
// concentrent l'offre touristique. Style Power BI : cartes KPI + bars horizontales.
export default function Tourisme() {
  const [data, setData] = useState(null)
  useEffect(() => {
    api.analystOverview().then(setData).catch(() => setData(null))
  }, [])

  if (!data) return <Loading />

  const cats = (data.top_categories || []).slice(0, 8)
  const catsMax = Math.max(...cats.map((c) => c.nb_poi || c.count || 0), 1)
  const deps = (data.top_departements || []).slice(0, 10)
  const depsMax = Math.max(...deps.map((d) => d.nb_poi || d.count || 0), 1)
  const dests = (data.top_destinations || []).slice(0, 10)
  const destsMax = Math.max(...dests.map((d) => d.nb_poi_5km || d.score || 0), 1)

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      <SectionHeader
        title="Tourisme"
        subtitle="Où se concentre l'offre : catégories, départements, destinations."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="POI touristiques" value={data.kpi?.poi_count} icon="pin" />
        <Kpi label="Destinations" value={data.kpi?.gares_count} icon="train" />
        <Kpi label="Départements" value={deps.length} icon="map" />
        <Kpi label="Catégories" value={cats.length} icon="dashboard" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Répartition des POI par catégorie" hint="Chaque barre = nombre de lieux d'une catégorie.">
          <BarList rows={cats} maxVal={catsMax} labelKey="categorie" valueKey="nb_poi" tone="eco" />
          <Insight text={`La catégorie « ${cats[0]?.categorie || '—'} » concentre le plus de lieux (${(cats[0]?.nb_poi || 0).toLocaleString('fr-FR')}).`} />
        </Card>

        <Card title="Top 10 départements par offre touristique" hint="Total POI référencés par département.">
          <BarList rows={deps} maxVal={depsMax} labelKey="departement" valueKey="nb_poi" tone="blue" />
          <Insight text={`Le département « ${deps[0]?.departement || '—'} » domine en diversité et en volume.`} />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Top 10 destinations les plus riches" hint="POI à moins de 5 km de la gare.">
          <BarList rows={dests} maxVal={destsMax} labelKey="commune" valueKey="nb_poi_5km" tone="eco" showRank />
          <Insight text="Les grandes gares urbaines dominent : elles cumulent restaurants, hébergements et activités à courte distance." />
        </Card>
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  )
}

function Kpi({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</span>
        <span className="text-eco"><Icon name={icon} className="h-4 w-4" /></span>
      </div>
      <div className="mt-1 text-2xl font-black text-ink">{(value || 0).toLocaleString('fr-FR')}</div>
    </div>
  )
}

function Card({ title, hint, children }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h3 className="text-sm font-black uppercase tracking-wider text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function BarList({ rows, maxVal, labelKey, valueKey, tone = 'eco', showRank }) {
  const barBg = tone === 'blue' ? 'bg-[#2563EB]' : 'bg-[#15803D]'
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const val = r[valueKey] || 0
        const w = Math.max(4, Math.round((val / maxVal) * 100))
        return (
          <li key={`${r[labelKey]}-${i}`} className="text-xs">
            <div className="flex items-center justify-between text-ink">
              <span className="truncate font-semibold">
                {showRank && <span className="mr-1 text-muted">{i + 1}.</span>}
                {r[labelKey] || '—'}
              </span>
              <span className="font-bold">{val.toLocaleString('fr-FR')}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-card2">
              <div className={`h-full rounded-full ${barBg} transition-all duration-700`} style={{ width: `${w}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Insight({ text }) {
  return (
    <div className="mt-4 rounded-xl bg-eco/5 p-3 text-xs text-ink">
      <span className="font-bold text-eco">Insight · </span>{text}
    </div>
  )
}

function Loading() {
  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <div className="h-8 w-40 animate-pulse rounded bg-card2" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((k) => <div key={k} className="h-20 animate-pulse rounded-2xl bg-card2" />)}
      </div>
    </div>
  )
}
