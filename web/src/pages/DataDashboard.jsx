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
  const anomalyRows = [
    ['Doublons gares', dq.anomalies.doublons_gares],
    ['Doublons POI', dq.anomalies.doublons_poi],
    ['Notes POI hors echelle 0-5', dq.anomalies.notes_poi_invalides],
    ['Categories trop generiques (Autre)', dq.anomalies.categories_autre],
    ['Coordonnees aberrantes', dq.anomalies.coordonnees_gares_aberrantes + dq.anomalies.coordonnees_poi_aberrantes],
    ['Jointures invalides', dq.anomalies.jointures_invalides],
    ['Destinations sans score', dq.anomalies.destinations_sans_score],
    ['Recommandations invalides', dq.anomalies.recommandations_invalides],
  ]

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      {/* En-tete */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-violet">
            Big Data &amp; IA - Architecture Medaillon
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-ink">Tableau de bord des données</h1>
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
            Score de qualité des données
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
            {Object.entries(dq.quality_dimensions).map(([key, value]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="capitalize text-muted">{key}</span>
                <span className="font-bold text-ink">{value}%</span>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-left text-[0.68rem] leading-relaxed text-muted">
            Score pondéré : complétude 25 %, validité 35 %, unicité 15 %, intégrité 25 %.
            Calcul en direct depuis PostgreSQL.
          </p>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Kpi
            label="Gares"
            value={fmt(dq.kpi.nb_gares)}
            sub={`${dq.completude.gares_geo_pct}% geolocalisees`}
          />
          <Kpi
            label="Points d'intérêt"
            value={fmt(dq.kpi.nb_poi)}
            sub={`${dq.completude.poi_geo_pct}% geolocalises`}
          />
          <Kpi
            label="Destinations analysées"
            value={fmt(dq.kpi.nb_dest_analysees)}
            sub="score d'attractivite calcule"
          />
          <Kpi label="Departements" value={fmt(dq.kpi.nb_departements)} sub="couverts" />
          <Kpi label="Profils voyageur" value={fmt(dq.kpi.nb_profils)} sub="modele KNN" />
          <Kpi
            label="Anomalies"
            value={fmt(dq.anomalies_total)}
            sub="controles qualite cumules"
          />
        </div>
      </div>

      {/* Qualite detaillee */}
      <section className="mt-10 rounded-2xl border border-line bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-ink">Controle qualite detaille</h2>
            <p className="mt-1 text-xs text-muted">
              Les indicateurs signalent les lignes a corriger ; ils ne sont pas masques par le score global.
            </p>
          </div>
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            {fmt(dq.nulls_total)} valeurs NULL critiques
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {anomalyRows.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-card2 p-4">
              <div className={`text-2xl font-black ${value ? 'text-amber-600' : 'text-emerald-600'}`}>
                {fmt(value)}
              </div>
              <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
            </div>
          ))}
        </div>
        <details className="mt-5 rounded-xl border border-line bg-card2 p-4 text-xs text-muted">
          <summary className="cursor-pointer font-bold text-ink">Voir le detail des valeurs NULL</summary>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {Object.entries(dq.nulls).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2 rounded-lg bg-card px-3 py-2">
                <span>{key.replaceAll('_', ' ')}</span><strong className="text-ink">{fmt(value)}</strong>
              </div>
            ))}
          </div>
        </details>
      </section>

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
          {dq.pipeline.map((s) => (
            <div key={s.layer} className="rounded-xl border border-line bg-card2 p-5">
              <div
                className="mb-3 inline-block rounded-full px-3 py-1 text-[0.65rem] font-black tracking-widest text-white"
                style={{ background: { bronze: '#b45309', silver: '#64748b', gold: '#ca8a04' }[s.layer] }}
              >
                {s.layer.toUpperCase()}
              </div>
              <div className="font-bold text-ink">{fmt(s.rows)} lignes suivies</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">
                {s.tables.length} tables controlees - {s.empty_tables} table(s) vide(s)
              </div>
              <div className="mt-3 space-y-1 border-t border-line pt-3 text-[0.68rem] text-muted">
                {s.tables.map((table) => (
                  <div key={table.table_name} className="flex justify-between gap-3">
                    <span>{table.table_name}</span><strong className="text-ink">{fmt(table.rows)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
