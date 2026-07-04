import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/analyste', label: 'Vue d’ensemble', end: true },
  { to: '/analyste/data-quality', label: 'Qualité Data' },
  { to: '/analyste/pipeline', label: 'Pipeline' },
  { to: '/analyste/ml', label: 'IA & Recommandations' },
  { to: '/analyste/decision', label: 'Décision SNCF' },
]

export default function AnalystLayout() {
  return (
    <div className="min-h-screen bg-card2/50">
      <section className="border-b border-line bg-gradient-to-br from-slate-950 via-slate-900 to-violet-dark text-white">
        <div className="mx-auto max-w-page px-6 py-10">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-violet-light">
            Data product - aide à la décision
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Espace Analyste</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            Piloter la qualité des données, suivre le pipeline, comprendre les modèles IA et
            identifier les territoires ferroviaires à valoriser.
          </p>
        </div>
      </section>

      <div className="sticky top-16 z-40 border-b border-line bg-card/95 backdrop-blur">
        <nav className="no-scrollbar mx-auto flex max-w-page gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Navigation analyste">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-[3px] px-3 py-4 text-sm font-bold transition ${
                  isActive ? 'border-violet text-violet' : 'border-transparent text-muted hover:text-ink'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
