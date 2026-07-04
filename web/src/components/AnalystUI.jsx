export const fmt = (value) => Number(value || 0).toLocaleString('fr-FR')

export function AnalystLoading() {
  return <div className="mx-auto max-w-page px-6 py-24 text-center text-sm text-muted">Chargement des indicateurs...</div>
}

export function AnalystError({ message = "Impossible de charger les données analytiques." }) {
  return (
    <div className="mx-auto max-w-page px-6 py-24 text-center">
      <div className="text-3xl">⚠</div>
      <p className="mt-3 text-sm font-semibold text-ink">{message}</p>
      <p className="mt-1 text-xs text-muted">Vérifiez que l’API et PostgreSQL sont disponibles.</p>
    </div>
  )
}

export function AnalystKpi({ label, value, sub, tone = 'violet' }) {
  const tones = {
    violet: 'bg-violet/10 text-violet',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
  }
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className={`inline-flex rounded-lg px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wider ${tones[tone]}`}>
        {label}
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1 text-xs leading-relaxed text-muted">{sub}</div>}
    </div>
  )
}

export function AnalystHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-7">
      <div className="text-[0.68rem] font-black uppercase tracking-[0.15em] text-violet">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>}
    </div>
  )
}

export function MiniBar({ label, value, max, detail }) {
  const width = max > 0 ? Math.max(2, Math.round((Number(value) / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className="font-bold text-muted">{detail ?? fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-card2">
        <div className="h-full rounded-full bg-violet" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
