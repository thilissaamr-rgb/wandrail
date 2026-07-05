import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import {
  AnalystError,
  AnalystHeading,
  AnalystKpi,
  AnalystLoading,
  AnalystPanel,
  SparkBars,
  fmt,
} from '../../components/AnalystUI'

export default function AnalystDecision() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.analystDecision().then(setData).catch(() => setError(true))
  }, [])

  if (error) return <AnalystError />
  if (!data) return <AnalystLoading />

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading
        eyebrow="Territoires"
        title="Où agir, où valoriser, où investir l'effort éditorial"
        description="Cette vue transforme les données nationales en décisions lisibles : destinations fortes, zones sous-exploitées, potentiel départemental et argument carbone."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalystKpi label="Distance moyenne" value={`${data.carbon.distance_moyenne_km} km`} sub="Trajets du scénario Gold" tone="cyan" />
        <AnalystKpi label="CO2 évité / trajet" value={`${data.carbon.economie_moyenne_kg_par_trajet} kg`} sub="Estimation train vs voiture" tone="emerald" />
        <AnalystKpi label="Scénario 1 000 voyageurs" value={`${fmt(data.carbon.scenario_1000_voyageurs_kg)} kg`} sub="Économie carbone projetée" tone="amber" />
        <AnalystKpi label="Départements lus" value={fmt(data.departments.length)} sub="Comparaison territoriale disponible" tone="violet" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AnalystPanel
          title="Destinations à fort potentiel"
          subtitle={data.definitions.fort_potentiel}
        >
          <SparkBars
            items={data.high_potential.map((row) => ({
              label: row.commune || row.nom_gare,
              value: Number(row.score) || 0,
              detail: `${Number(row.score).toFixed(1)} · ${fmt(row.nb_poi_5km)} POI`,
            }))}
            color="#34d399"
          />
        </AnalystPanel>

        <AnalystPanel
          title="Opportunités sous-exploitées"
          subtitle={data.definitions.sous_exploitee}
        >
          <SparkBars
            items={data.underused.map((row) => ({
              label: row.commune || row.nom_gare,
              value: Number(row.indice_opportunite) || 0,
              detail: `indice ${row.indice_opportunite} · trafic ${fmt(row.nb_voyageurs_annuel)}`,
            }))}
            color="#f59e0b"
          />
        </AnalystPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AnalystPanel
          title="Départements à valoriser"
          subtitle="Comparaison des meilleurs équilibres entre maillage gare, richesse POI et score moyen."
        >
          <SparkBars
            items={data.departments.slice(0, 8).map((row) => ({
              label: row.departement,
              value: Number(row.score_moyen) || 0,
              detail: `score ${row.score_moyen} · ${fmt(row.nb_gares)} gares`,
            }))}
            color="#60a5fa"
          />
        </AnalystPanel>

        <AnalystPanel
          title="Lecture stratégique"
          subtitle="Comment utiliser cette vue devant le jury ou un partenaire territorial."
        >
          <div className="space-y-3">
            <Insight text="Les gares à fort potentiel montrent où l'offre touristique est déjà crédible pour l'expérience voyageur." />
            <Insight text="Les opportunités sous-exploitées révèlent les lieux où une meilleure mise en avant peut produire un gain d'usage." />
            <Insight text="La lecture départementale permet d'argumenter une extension éditoriale, des campagnes locales ou des partenariats." />
            <Insight text={data.definitions.carbone} />
          </div>
        </AnalystPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <RankPanel
          title="Gares les plus riches en POI"
          subtitle="Vision d'attractivité brute autour des gares."
          rows={data.poi_rich}
          valueLabel="POI à 5 km"
          color="bg-emerald-400"
        />

        <RankPanel
          title="Gares les plus fragiles"
          subtitle="Peu de POI et score faible : zones à surveiller ou à compléter en données."
          rows={data.poi_sparse}
          valueLabel="POI à 5 km"
          color="bg-rose-400"
        />
      </div>
    </div>
  )
}

function RankPanel({ title, subtitle, rows, valueLabel, color }) {
  return (
    <AnalystPanel title={title} subtitle={subtitle}>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.nom_gare} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className={`mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-black text-slate-950 ${color}`}>
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">{row.commune || row.nom_gare}</div>
              <div className="mt-1 text-xs text-slate-400">{row.departement}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-white">{fmt(row.nb_poi_5km)}</div>
              <div className="text-[0.68rem] uppercase tracking-[0.14em] text-slate-500">{valueLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </AnalystPanel>
  )
}

function Insight({ text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300">
      {text}
    </div>
  )
}
