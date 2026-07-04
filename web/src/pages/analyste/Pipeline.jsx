import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { AnalystError, AnalystHeading, AnalystLoading, fmt } from '../../components/AnalystUI'

const colors = { bronze: '#b45309', silver: '#64748b', gold: '#ca8a04', ml: '#7c3aed', api: '#2563eb', frontend: '#059669' }

export default function AnalystPipeline() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => { api.pipeline().then(setData).catch(() => setError(true)) }, [])
  if (error) return <AnalystError />
  if (!data) return <AnalystLoading />

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading eyebrow="Data Engineering" title="Bronze → Silver → Gold → ML → API → Frontend" description="Chaque étape possède un rôle, des transformations et des contrôles distincts. Les volumes affichés proviennent de la base courante." />
      <div className="space-y-4">
        {data.stages.map((stage, index) => (
          <div key={stage.id}>
            <article className="grid gap-5 rounded-2xl border border-line bg-card p-5 shadow-card lg:grid-cols-[170px_1.2fr_1fr_1fr]">
              <div>
                <span className="inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest text-white" style={{ background: colors[stage.id] }}>{stage.label}</span>
                <div className="mt-3 text-2xl font-black text-ink">{stage.rows == null ? 'Service' : fmt(stage.rows)}</div>
                <div className="text-xs text-muted">{stage.rows == null ? 'couche applicative' : 'lignes suivies'}</div>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted">Rôle</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink">{stage.role}</p>
                {stage.tables.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{stage.tables.map((table) => <span key={table.table_name} className="rounded-md bg-card2 px-2 py-1 font-mono text-[0.65rem] text-muted">{table.table_name} · {fmt(table.rows)}</span>)}</div>}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted">Transformations</h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">{stage.transformations.map((item) => <li key={item}>• {item}</li>)}</ul>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted">Contrôles</h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">{stage.controls.map((item) => <li key={item}>✓ {item}</li>)}</ul>
              </div>
            </article>
            {index < data.stages.length - 1 && <div className="flex h-8 items-center justify-center text-2xl font-black text-violet">↓</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
