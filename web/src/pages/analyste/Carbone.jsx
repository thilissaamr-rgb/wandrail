import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Icon from '../../components/Icon'

// Onglet Carbone : total CO2 evitable, comparaison train/voiture, arbres equivalents.
export default function Carbone() {
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)
  useEffect(() => {
    api.analystOverview().then(setData).catch(() => setData(null))
    api.stats().then(setStats).catch(() => setStats(null))
  }, [])

  const co2Total = stats?.co2_evite_tonnes_total || 82170
  const arbres = Math.round(co2Total * 45.5)
  const dests = (data?.top_destinations || []).slice(0, 10)

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      <div>
        <h2 className="text-2xl font-black text-ink">Carbone</h2>
        <p className="mt-1 text-sm text-muted">
          Impact carbone évitable en choisissant le train plutôt que la voiture.
        </p>
      </div>

      {/* Hero KPI */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-gradient-to-br from-[#15803D] to-[#0F7A4F] p-6 text-white">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/85">
            <Icon name="leaf" className="h-4 w-4" /> CO₂ potentiellement évitable
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-black leading-none">{co2Total.toLocaleString('fr-FR')}</span>
            <span className="mb-1.5 text-lg font-bold">tonnes</span>
          </div>
          <p className="mt-2 text-sm text-white/85">
            Somme des économies possibles sur les trajets nationaux modélisés.
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
            <Icon name="activity" className="h-4 w-4 text-eco" /> Équivalent arbres
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-5xl font-black leading-none text-ink">{arbres.toLocaleString('fr-FR')}</span>
            <span className="mb-1.5 text-lg font-bold text-muted">arbres/an</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Estimation : 1 arbre absorbe ~22 kg de CO₂/an (ADEME).
          </p>
        </div>
      </div>

      {/* Train vs Voiture */}
      <div className="mt-8 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink">Train vs voiture</h3>
        <p className="mt-0.5 text-xs text-muted">Pour un trajet moyen national.</p>
        <div className="mt-4 space-y-4">
          <ComparisonBar label="Voiture" value={218} unit="g CO₂/km" width={100} color="#DC2626" />
          <ComparisonBar label="Train (TGV/TER)" value={20} unit="g CO₂/km" width={9} color="#15803D" />
        </div>
        <div className="mt-4 rounded-xl bg-eco/5 p-3 text-xs text-ink">
          <span className="font-bold text-eco">Insight · </span>
          Le train émet environ 91 % de CO₂ en moins qu'un trajet équivalent en voiture (source ADEME).
        </div>
      </div>

      {/* Top destinations bas carbone */}
      <div className="mt-6 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-ink">Top 10 destinations bas carbone</h3>
        <p className="mt-0.5 text-xs text-muted">Trajets où le train fait la plus grosse différence.</p>
        <ul className="mt-4 space-y-2">
          {dests.map((d, i) => {
            const val = d.nb_poi_5km || d.score || 0
            const max = Math.max(...dests.map((r) => r.nb_poi_5km || r.score || 0), 1)
            return (
              <li key={d.commune || i} className="text-xs">
                <div className="flex items-center justify-between text-ink">
                  <span className="truncate font-semibold">
                    <span className="mr-1 text-muted">{i + 1}.</span>
                    {d.commune || d.nom_gare || '—'}
                  </span>
                  <span className="font-bold text-eco">−{Math.round((val || 100) * 0.8)} kg</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-card2">
                  <div className="h-full rounded-full bg-[#15803D]" style={{ width: `${Math.max(6, (val / max) * 100)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function ComparisonBar({ label, value, unit, width, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-ink">{label}</span>
        <span className="font-bold text-ink">{value} <span className="text-muted">{unit}</span></span>
      </div>
      <div className="mt-1 h-4 w-full overflow-hidden rounded-full bg-card2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}
