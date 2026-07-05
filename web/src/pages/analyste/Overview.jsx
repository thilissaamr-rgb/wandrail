import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { AnalystError, AnalystHeading, AnalystKpi, AnalystLoading, MiniBar, fmt } from '../../components/AnalystUI'

export default function AnalystOverview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.analystOverview().then(setData).catch(() => setError(true))
  }, [])

  if (error) return <AnalystError />
  if (!data) return <AnalystLoading />

  const maxCategory = Math.max(...data.top_categories.map((item) => item.nb), 1)
  const maxDepartment = Math.max(...data.top_departements.map((item) => item.nb_gares), 1)

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading
        eyebrow="Vue d’ensemble Data"
        title="Les indicateurs essentiels en un regard"
        description="Photographie calculée depuis les couches Silver et Gold de PostgreSQL."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AnalystKpi label="Gares" value={fmt(data.kpi.nb_gares)} sub="France métropolitaine" />
        <AnalystKpi label="POI" value={fmt(data.kpi.nb_poi)} sub="DATAtourisme + OSM" tone="blue" />
        <AnalystKpi label="Destinations" value={fmt(data.kpi.nb_dest_analysees)} sub="avec score d’attractivité" tone="green" />
        <AnalystKpi label="Recommandations" value={fmt(data.kpi.nb_recommandations)} sub={`${data.kpi.nb_profils} profils voyageurs`} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section className="min-w-0 rounded-2xl border border-line bg-card p-6 shadow-card">
          <div className="text-xs font-black uppercase tracking-wider text-muted">Qualité globale</div>
          <div className="mt-2 text-5xl font-black tracking-tighter text-ink">{data.quality_score}<span className="text-lg text-muted">/100</span></div>
          <div className="mt-5 space-y-3">
            {Object.entries(data.quality_dimensions).map(([label, value]) => (
              <MiniBar key={label} label={label} value={value} max={100} detail={`${value}%`} />
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-card2 p-3 text-xs text-muted">
            Complétude géographique : <strong className="text-ink">{data.completude_geographique}%</strong><br />
            Anomalies suivies : <strong className="text-ink">{fmt(data.anomalies_total)}</strong>
          </div>
          <Link to="/analyste/data-quality" className="mt-4 inline-flex text-sm font-bold text-violet hover:underline">
            Ouvrir le rapport qualité &rarr;
          </Link>
        </section>

        <section className="min-w-0 rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-lg font-black text-ink">Top destinations</h3>
          <p className="mt-1 text-xs text-muted">Classement par score d’attractivité Gold.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="py-3">Destination</th><th>Département</th><th className="text-right">POI à 5 km</th><th className="text-right">Score</th></tr>
              </thead>
              <tbody>
                {data.top_destinations.map((item) => (
                  <tr key={item.nom_gare} className="border-b border-line/60">
                    <td className="py-3 font-bold text-ink">{item.commune || item.nom_gare}</td>
                    <td className="text-muted">{item.departement}</td>
                    <td className="text-right text-muted">{fmt(item.nb_poi)}</td>
                    <td className="text-right font-black text-violet">{Number(item.score).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-lg font-black text-ink">Top catégories de POI</h3>
          <div className="mt-5 space-y-4">
            {data.top_categories.map((item) => <MiniBar key={item.label} label={item.label} value={item.nb} max={maxCategory} />)}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-lg font-black text-ink">Couverture par département</h3>
          <div className="mt-5 space-y-4">
            {data.top_departements.map((item) => <MiniBar key={item.label} label={item.label} value={item.nb_gares} max={maxDepartment} detail={`${item.nb_gares} gares`} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
