import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { AnalystError, AnalystHeading, AnalystKpi, AnalystLoading, fmt } from '../../components/AnalystUI'

function DestinationTable({ rows, opportunity = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-line text-left text-[0.68rem] uppercase tracking-wider text-muted"><tr><th className="py-3">Gare</th><th>Département</th><th className="text-right">POI</th><th className="text-right">Trafic</th><th className="text-right">{opportunity ? 'Indice' : 'Score'}</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.nom_gare} className="border-b border-line/60"><td className="py-3 font-bold text-ink">{row.commune || row.nom_gare}<div className="text-[0.65rem] font-normal text-muted">{row.nom_gare}</div></td><td className="text-muted">{row.departement}</td><td className="text-right text-muted">{fmt(row.nb_poi_5km)}</td><td className="text-right text-muted">{fmt(row.nb_voyageurs_annuel)}</td><td className="text-right font-black text-violet">{opportunity ? row.indice_opportunite : Number(row.score).toFixed(1)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

export default function AnalystDecision() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => { api.analystDecision().then(setData).catch(() => setError(true)) }, [])
  if (error) return <AnalystError />
  if (!data) return <AnalystLoading />

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading eyebrow="Décision SNCF & territoires" title="Transformer les données en leviers de promotion" description="Ces indicateurs orientent l’analyse ; ils ne remplacent ni les études de desserte ni les enquêtes de fréquentation locales." />
      <div className="grid gap-4 sm:grid-cols-3">
        <AnalystKpi label="Distance moyenne" value={`${data.carbon.distance_moyenne_km} km`} sub="scénarios de trajets Gold" tone="blue" />
        <AnalystKpi label="CO₂ évité / trajet" value={`${data.carbon.economie_moyenne_kg_par_trajet} kg`} sub="train comparé à la voiture" tone="green" />
        <AnalystKpi label="Scénario 1 000 voyageurs" value={`${fmt(data.carbon.scenario_1000_voyageurs_kg)} kg`} sub="estimation, pas un impact observé" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border border-line bg-card p-6 shadow-card"><h3 className="text-lg font-black text-ink">Destinations à fort potentiel</h3><p className="mb-4 mt-1 text-xs text-muted">{data.definitions.fort_potentiel}</p><DestinationTable rows={data.high_potential} /></section>
        <section className="min-w-0 rounded-2xl border border-line bg-card p-6 shadow-card"><h3 className="text-lg font-black text-ink">Opportunités sous-exploitées</h3><p className="mb-4 mt-1 text-xs text-muted">{data.definitions.sous_exploitee}</p><DestinationTable rows={data.underused} opportunity /></section>
      </div>

      <section className="mt-6 min-w-0 rounded-2xl border border-line bg-card p-6 shadow-card">
        <h3 className="text-lg font-black text-ink">Départements à valoriser</h3>
        <p className="mt-1 text-xs text-muted">Comparer richesse touristique, couverture ferroviaire, score et trafic moyen.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted"><tr><th className="py-3">Département</th><th className="text-right">Gares</th><th className="text-right">POI à 5 km</th><th className="text-right">Score moyen</th><th className="text-right">Trafic moyen</th></tr></thead><tbody>{data.departments.map((row) => <tr key={row.departement} className="border-b border-line/60"><td className="py-3 font-bold text-ink">{row.departement}</td><td className="text-right text-muted">{row.nb_gares}</td><td className="text-right text-muted">{fmt(row.nb_poi_5km)}</td><td className="text-right font-black text-violet">{row.score_moyen}</td><td className="text-right text-muted">{fmt(row.trafic_moyen)}</td></tr>)}</tbody></table></div>
      </section>

      <div className="mt-6 rounded-2xl border border-green-200 bg-emerald-50 p-5 text-sm leading-relaxed text-emerald-950">
        <strong>Lecture métier :</strong> croiser les destinations sous-exploitées avec les POI proches permet de cibler des campagnes régionales, des partenariats avec les offices de tourisme ou des améliorations d’information en gare. {data.definitions.carbone}
      </div>
    </div>
  )
}
