import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ecoColor } from '../lib/eco'

const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

function Kpi({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="text-xs font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tighter text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

function Bar({ label, value, max, right }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="font-bold text-muted">{right || fmt(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-card2">
        <div
          className="h-full rounded-full bg-violet transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function DataDashboard() {
  const [dq, setDq] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    api.dataQuality().then(setDq).catch(() => setErr(true))
  }, [])

  if (err) {
    return (
      <div className="mx-auto max-w-page px-6 py-24 text-center text-muted">
        Impossible de charger les indicateurs. Verifiez que l'API est en ligne.
      </div>
    )
  }

  if (!dq) {
    return <div className="mx-auto max-w-page px-6 py-24 text-center text-muted">Chargement...</div>
  }

  const maxCat = Math.max(...dq.top_categories.map((c) => c.nb))
  const maxDep = Math.max(...dq.top_departements.map((d) => d.nb_gares))

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      {/* En-tete */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-violet">
            Big Data &amp; IA - Architecture Medaillon
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-ink">Tableau de bord donnees</h1>
          <p className="mt-1 text-sm text-muted">
            Vue d'ensemble du pipeline SNCF Open Data + DATAtourisme + INSEE + OSM.
          </p>
        </div>
        <Link
          to="/methodologie"
          className="rounded-full border border-line px-4 py-2 text-sm font-bold text-violet transition hover:bg-violet hover:text-white"
        >
          Voir la methodologie &rarr;
        </Link>
      </div>

      {/* Score qualite global */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-2xl border border-line bg-card p-6 text-center shadow-card">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">
            Score qualite donnees
          </div>
          <div className="relative mx-auto mt-4 h-40 w-40">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={ecoColor(dq.quality_score)}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(dq.quality_score / 100) * 264} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tracking-tighter text-ink">
                {dq.quality_score}
              </span>
              <span className="text-xs font-semibold text-muted">/ 100</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-left">
            <div className="flex justify-between text-xs">
              <span className="text-muted">Gares geolocalisees</span>
              <span className="font-bold text-ink">{dq.completude.gares_geo_pct}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">POI geolocalises</span>
              <span className="font-bold text-ink">{dq.completude.poi_geo_pct}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Destinations analysees</span>
              <span className="font-bold text-ink">{dq.completude.analyses_pct}%</span>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Kpi
            label="Gares"
            value={fmt(dq.kpi.nb_gares)}
            sub={`${dq.completude.gares_geo_pct}% geolocalisees`}
          />
          <Kpi
            label="Points d'interet"
            value={fmt(dq.kpi.nb_poi)}
            sub={`${dq.completude.poi_geo_pct}% geolocalises`}
          />
          <Kpi
            label="Destinations analysees"
            value={fmt(dq.kpi.nb_dest_analysees)}
            sub="score d'attractivite calcule"
          />
          <Kpi label="Departements" value={fmt(dq.kpi.nb_departements)} sub="couverts" />
          <Kpi label="Profils voyageur" value={fmt(dq.kpi.nb_profils)} sub="modele KNN" />
          <Kpi
            label="Categories POI"
            value={fmt(dq.top_categories.length)}
            sub="DATAtourisme"
          />
        </div>
      </div>

      {/* Repartition */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h2 className="mb-1 text-lg font-black tracking-tight text-ink">
            Repartition des activites par categorie
          </h2>
          <p className="mb-5 text-xs text-muted">
            Categories issues du referentiel DATAtourisme (nettoyees dans silver.poi).
          </p>
          <div className="space-y-4">
            {dq.top_categories.map((c) => (
              <Bar key={c.label} label={c.label} value={c.nb} max={maxCat} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h2 className="mb-1 text-lg font-black tracking-tight text-ink">
            Gares par departement
          </h2>
          <p className="mb-5 text-xs text-muted">
            Distribution du reseau ferroviaire regional (silver.gares).
          </p>
          <div className="space-y-4">
            {dq.top_departements.map((d) => (
              <Bar
                key={d.label}
                label={d.label}
                value={d.nb_gares}
                max={maxDep}
                right={`${d.nb_gares} gares`}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Top destinations */}
      <section className="mt-10 rounded-2xl border border-line bg-card p-6 shadow-card">
        <h2 className="mb-1 text-lg font-black tracking-tight text-ink">
          Top 10 destinations par score d'attractivite
        </h2>
        <p className="mb-5 text-xs text-muted">
          Score calcule dans gold.dim_gare a partir du nombre de POI, de leur diversite
          et de la densite touristique.
        </p>
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-card2 text-left text-xs font-bold uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Destination</th>
                <th className="p-3 hidden sm:table-cell">Departement</th>
                <th className="p-3 text-right">POI a 5 km</th>
                <th className="p-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {dq.top_destinations.map((d, i) => (
                <tr key={d.nom_gare} className="border-t border-line hover:bg-card2">
                  <td className="p-3 font-bold text-muted">{i + 1}</td>
                  <td className="p-3">
                    <Link
                      to={`/destinations/${encodeURIComponent(d.nom_gare)}`}
                      className="font-bold text-ink hover:text-violet"
                    >
                      {cap(d.commune || d.nom_gare)}
                    </Link>
                  </td>
                  <td className="p-3 hidden text-muted sm:table-cell">{cap(d.departement)}</td>
                  <td className="p-3 text-right text-muted">{fmt(d.nb_poi)}</td>
                  <td className="p-3 text-right">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                      style={{ background: ecoColor(Number(d.score) * 10) }}
                    >
                      {Number(d.score).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pipeline visuel */}
      <section className="mt-10 rounded-2xl border border-line bg-card p-6 shadow-card">
        <h2 className="mb-5 text-lg font-black tracking-tight text-ink">
          Pipeline Medaillon : Bronze &rarr; Silver &rarr; Gold
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              tier: 'BRONZE',
              color: '#b45309',
              titre: 'Donnees brutes',
              desc: 'SNCF Open Data, DATAtourisme, INSEE, OpenStreetMap. Ingestion sans transformation.',
            },
            {
              tier: 'SILVER',
              color: '#64748b',
              titre: 'Donnees nettoyees',
              desc: `${fmt(dq.kpi.nb_gares)} gares + ${fmt(dq.kpi.nb_poi)} POI enrichis (distance gare, temps marche).`,
            },
            {
              tier: 'GOLD',
              color: '#ca8a04',
              titre: 'Donnees business',
              desc: `${fmt(dq.kpi.nb_dest_analysees)} destinations scorees + ${dq.kpi.nb_profils} profils + recommandations KNN.`,
            },
          ].map((s) => (
            <div key={s.tier} className="rounded-xl border border-line bg-card2 p-5">
              <div
                className="mb-3 inline-block rounded-full px-3 py-1 text-[0.65rem] font-black tracking-widest text-white"
                style={{ background: s.color }}
              >
                {s.tier}
              </div>
              <div className="font-bold text-ink">{s.titre}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
