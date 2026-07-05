export const fmt = (value) => Number(value || 0).toLocaleString('fr-FR')

export function AnalystLoading() {
  // Skeleton anime : donne l'impression que la structure est deja la et que
  // les chiffres arrivent. Bien plus fluide qu'un "Chargement..." statique.
  return (
    <div className="mx-auto max-w-page animate-pulse px-6 py-10">
      <div className="h-8 w-2/3 rounded-lg bg-white/5" />
      <div className="mt-3 h-4 w-1/2 rounded-lg bg-white/5" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="h-28 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="h-3 w-2/3 rounded bg-white/10" />
            <div className="mt-4 h-8 w-1/2 rounded bg-white/10" />
            <div className="mt-3 h-3 w-3/4 rounded bg-white/5" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="h-64 rounded-2xl border border-white/10 bg-white/[0.03]" />
        <div className="h-64 rounded-2xl border border-white/10 bg-white/[0.03]" />
      </div>
    </div>
  )
}

export function AnalystError({ message = 'Impossible de charger les données analytiques.' }) {
  return (
    <div className="mx-auto max-w-page px-6 py-24 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-lg text-amber-300">
        !
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{message}</p>
      <p className="mt-1 text-xs text-slate-400">Vérifie l’API et la base PostgreSQL.</p>
    </div>
  )
}

export function AnalystHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-8 rounded-[28px] border border-white/10 bg-slate-900/85 p-6 shadow-[0_24px_60px_rgba(0,0,0,.28)] backdrop-blur sm:p-8">
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</div>
      <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{description}</p>}
    </div>
  )
}

export function AnalystKpi({ label, value, sub, tone = 'cyan' }) {
  const tones = {
    cyan: 'from-cyan-500/25 to-slate-900',
    emerald: 'from-emerald-500/25 to-slate-900',
    amber: 'from-amber-500/25 to-slate-900',
    rose: 'from-rose-500/25 to-slate-900',
    violet: 'from-violet-500/25 to-slate-900',
  }

  return (
    <div className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${tones[tone]} p-5 shadow-[0_14px_40px_rgba(0,0,0,.22)]`}>
      <div className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-white">{value}</div>
      {sub && <div className="mt-2 text-xs leading-relaxed text-slate-400">{sub}</div>}
    </div>
  )
}

export function AnalystPanel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`rounded-[24px] border border-white/10 bg-slate-900/85 p-5 shadow-[0_18px_48px_rgba(0,0,0,.24)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-black text-white">{title}</h3>}
          {subtitle && <p className="mt-1 text-xs leading-6 text-slate-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

export function MetricTable({ rows, headers }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[520px] text-sm">
        {headers && (
          <thead className="bg-white/5 text-left text-[0.68rem] uppercase tracking-[0.16em] text-slate-400">
            <tr>
              {headers.map((header) => (
                <th key={header.key} className={`px-4 py-3 ${header.align === 'right' ? 'text-right' : ''}`}>
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key || index} className="border-t border-white/10">
              {row.cells.map((cell, cellIndex) => (
                <td key={cellIndex} className={`px-4 py-3 ${cell.align === 'right' ? 'text-right' : ''} ${cell.emphasis ? 'font-semibold text-white' : 'text-slate-300'}`}>
                  {cell.content}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SparkBars({ items, color = '#22d3ee' }) {
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = Math.max(6, Math.round(((Number(item.value) || 0) / max) * 100))
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">{item.label}</span>
              <span className="font-semibold text-white">{item.detail || fmt(item.value)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/8">
              <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DonutGauge({ value, label, color = '#22d3ee' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const dash = `${(pct / 100) * 264} 264`

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={dash} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{pct}</span>
          <span className="text-[0.65rem] text-slate-400">/100</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="mt-1 text-xs leading-6 text-slate-400">Mesure synthétique calculée depuis la base courante.</div>
      </div>
    </div>
  )
}

export function LineMiniChart({ values, color = '#22d3ee', labels = [] }) {
  const width = 360
  const height = 160
  const safe = values.map((value) => Number(value) || 0)
  const max = Math.max(...safe, 1)
  const min = Math.min(...safe, 0)
  const range = max - min || 1
  const points = safe.map((value, index) => {
    const x = (index / Math.max(safe.length - 1, 1)) * (width - 24) + 12
    const y = height - 16 - ((value - min) / range) * (height - 32)
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
        <defs>
          <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M 12 ${height - 16} ${points ? `L ${points} L ${width - 12} ${height - 16}` : ''} Z`} fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, '')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {safe.map((value, index) => {
          const x = (index / Math.max(safe.length - 1, 1)) * (width - 24) + 12
          const y = height - 16 - ((value - min) / range) * (height - 32)
          return <circle key={index} cx={x} cy={y} r="4" fill={color} />
        })}
      </svg>
      {labels.length > 0 && (
        <div className="mt-2 flex justify-between text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
          {labels.map((label) => <span key={label}>{label}</span>)}
        </div>
      )}
    </div>
  )
}
