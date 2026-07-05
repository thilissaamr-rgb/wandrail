import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { AnalystError, AnalystHeading, AnalystLoading, AnalystPanel, SparkBars, fmt } from '../../components/AnalystUI'

const stageColors = {
  bronze: 'from-amber-500/20 to-slate-900',
  silver: 'from-slate-300/15 to-slate-900',
  gold: 'from-yellow-400/20 to-slate-900',
  ml: 'from-violet-500/20 to-slate-900',
  api: 'from-cyan-500/20 to-slate-900',
  frontend: 'from-emerald-500/20 to-slate-900',
}

export default function AnalystPipeline() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.pipeline().then(setData).catch(() => setError(true))
  }, [])

  if (error) return <AnalystError />
  if (!data) return <AnalystLoading />

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading
        eyebrow="Pipeline"
        title="La chaîne complète de transformation"
        description="Cette vue sert à défendre le projet comme un vrai système data : ingestion, nettoyage, enrichissement, modélisation puis exposition applicative."
      />

      <div className="grid gap-4 xl:grid-cols-6">
        {data.stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${stageColors[stage.id] || 'from-white/5 to-slate-900'} p-5 shadow-[0_18px_44px_rgba(0,0,0,.22)]`}
          >
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">{stage.id}</div>
            <div className="mt-3 text-xl font-black text-white">{stage.label}</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">{stage.rows == null ? 'Service' : `${fmt(stage.rows)} lignes`}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <AnalystPanel
          title="Volume piloté par étage"
          subtitle="Comparaison visuelle des volumes qui transitent dans l'architecture."
        >
          <SparkBars
            items={data.stages.map((stage) => ({
              label: stage.label,
              value: stage.rows == null ? 1 : stage.rows,
              detail: stage.rows == null ? 'service applicatif' : fmt(stage.rows),
            }))}
            color="#22d3ee"
          />
        </AnalystPanel>

        <AnalystPanel
          title="Lecture soutenance"
          subtitle="Ce que le jury doit comprendre rapidement."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Insight title="Bronze" text="On conserve la trace des sources et des volumes d'ingestion." />
            <Insight title="Silver" text="On nettoie, normalise, géolocalise et relie gares / POI." />
            <Insight title="Gold" text="On fabrique les features métiers et les scores exploitables." />
            <Insight title="ML + API + Front" text="On sert une recommandation explicable dans une application réelle." />
          </div>
        </AnalystPanel>
      </div>

      <div className="mt-6 space-y-6">
        {data.stages.map((stage, index) => (
          <section key={stage.id} className="rounded-[28px] border border-white/10 bg-slate-900/85 p-6 shadow-[0_18px_48px_rgba(0,0,0,.24)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  Étape {index + 1}
                </div>
                <h3 className="mt-2 text-2xl font-black text-white">{stage.label}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{stage.role}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">Charge suivie</div>
                <div className="mt-1 text-xl font-black text-white">
                  {stage.rows == null ? 'Applicatif' : fmt(stage.rows)}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <StageBox title="Tables / artefacts">
                {stage.tables.length > 0 ? (
                  <div className="space-y-3">
                    {stage.tables.map((table) => (
                      <div key={table.table_name} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                        <div className="text-sm font-semibold text-white">{table.table_name}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {fmt(table.rows)} élément{Number(table.rows) > 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStage text="Pas de table relationnelle affichée : l'étape agit comme couche de service." />
                )}
              </StageBox>

              <StageBox title="Transformations majeures">
                <BulletList items={stage.transformations} color="bg-emerald-400" />
              </StageBox>

              <StageBox title="Contrôles et garanties">
                <BulletList items={stage.controls} color="bg-cyan-400" />
              </StageBox>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function StageBox({ title, children }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      {children}
    </div>
  )
}

function BulletList({ items, color }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
          <span className={`mt-2 h-2.5 w-2.5 flex-none rounded-full ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function EmptyStage({ text }) {
  return <p className="text-sm leading-6 text-slate-400">{text}</p>
}

function Insight({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-sm font-bold text-white">{title}</div>
      <p className="mt-2 text-xs leading-6 text-slate-400">{text}</p>
    </div>
  )
}
