import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import {
  AnalystError,
  AnalystHeading,
  AnalystKpi,
  AnalystLoading,
  AnalystPanel,
  DonutGauge,
  SparkBars,
  fmt,
} from '../components/AnalystUI'

const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function DataDashboard() {
  const [dq, setDq] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    api.dataQuality().then(setDq).catch(() => setErr(true))
  }, [])

  if (err) return <AnalystError message="Impossible de charger les indicateurs de qualité." />
  if (!dq) return <AnalystLoading />

  const anomalyItems = [
    ['Doublons gares', dq.anomalies.doublons_gares],
    ['Doublons POI', dq.anomalies.doublons_poi],
    ['Coordonnées aberrantes', dq.anomalies.coordonnees_gares_aberrantes + dq.anomalies.coordonnees_poi_aberrantes],
    ['Jointures invalides', dq.anomalies.jointures_invalides],
    ['Destinations sans score', dq.anomalies.destinations_sans_score],
    ['Recommandations invalides', dq.anomalies.recommandations_invalides],
  ]

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading
        eyebrow="Qualité de donnée"
        title="Le cockpit de contrôle du pipeline national"
        description="Cet écran défend la crédibilité du projet : complétude, anomalies, doublons, couverture et destinations réellement exploitables."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalystKpi label="Score qualité" value={`${dq.quality_score}/100`} sub="Score global calculé depuis les contrôles" tone="cyan" />
        <AnalystKpi label="Anomalies" value={fmt(dq.anomalies_total)} sub="Incidents détectés dans la chaîne" tone="rose" />
        <AnalystKpi label="Nulls suivis" value={fmt(dq.nulls_total)} sub="Champs manquants critiques" tone="amber" />
        <AnalystKpi label="Destinations scorées" value={fmt(dq.kpi.nb_dest_analysees)} sub="Destinations prêtes pour recommandation" tone="emerald" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <AnalystPanel title="Niveau de confiance" subtitle="Vue synthétique immédiatement compréhensible en soutenance.">
          <DonutGauge value={dq.quality_score} label="Score de qualité consolidé" color="#22d3ee" />
        </AnalystPanel>

        <AnalystPanel title="Volumes structurants" subtitle="Les grandeurs principales du référentiel exploité.">
          <div className="grid gap-4 sm:grid-cols-2">
            <MiniStat label="Gares" value={fmt(dq.kpi.nb_gares)} />
            <MiniStat label="POI" value={fmt(dq.kpi.nb_poi)} />
            <MiniStat label="Départements" value={fmt(dq.kpi.nb_departements)} />
            <MiniStat label="Profils" value={fmt(dq.kpi.nb_profils)} />
          </div>
        </AnalystPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AnalystPanel title="Anomalies à surveiller" subtitle="Les points faibles concrets à mentionner avec honnêteté.">
          <SparkBars
            items={anomalyItems.map(([label, value]) => ({
              label,
              value,
              detail: fmt(value),
            }))}
            color="#f87171"
          />
        </AnalystPanel>

        <AnalystPanel title="Pipeline Bronze / Silver / Gold" subtitle="Comparaison rapide des couches pour expliquer la méthode.">
          <SparkBars
            items={dq.pipeline.map((item) => ({
              label: item.layer.toUpperCase(),
              value: Number(item.rows) || 0,
              detail: `${fmt(item.rows)} lignes · ${item.tables.length} table(s)`,
            }))}
            color="#60a5fa"
          />
        </AnalystPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AnalystPanel title="Top destinations les mieux préparées" subtitle="Les gares qui combinent offre touristique et score exploitable." className="xl:col-span-1">
          <SparkBars
            items={dq.top_destinations.slice(0, 8).map((item) => ({
              label: cap(item.commune || item.nom_gare),
              value: Number(item.score) || 0,
              detail: `${Number(item.score).toFixed(1)} · ${fmt(item.nb_poi)} POI`,
            }))}
            color="#34d399"
          />
        </AnalystPanel>

        <AnalystPanel title="Lien avec la méthodologie" subtitle="Pour garder la cohérence entre dashboard et soutenance.">
          <div className="space-y-3">
            <MethodLink
              to="/methodologie"
              title="Méthodologie complète"
              text="Nettoyage, enrichissement, scoring, KMeans, KNN, limites et perspectives."
            />
            <MethodLink
              to="/analyste/pipeline"
              title="Voir le pipeline"
              text="Parcours détaillé de Bronze à Frontend."
            />
            <MethodLink
              to="/analyste/ml"
              title="Voir les modèles"
              text="Métriques, variables et lecture défendable du machine learning."
            />
          </div>
        </AnalystPanel>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  )
}

function MethodLink({ to, title, text }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.05]"
    >
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="mt-2 text-xs leading-6 text-slate-400">{text}</div>
    </Link>
  )
}
