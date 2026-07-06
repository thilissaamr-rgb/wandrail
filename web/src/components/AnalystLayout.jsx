import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/analyste', label: 'Vue générale', end: true },
  { to: '/analyste/tourisme', label: 'Tourisme' },
  { to: '/analyste/carbone', label: 'Carbone' },
  { to: '/analyste/profils', label: 'Profils' },
  { to: '/analyste/decision', label: 'Territoires' },
  { to: '/analyste/ml', label: 'Machine Learning' },
  { to: '/analyste/justification', label: 'Justification', highlight: true },
]

export default function AnalystLayout() {
  return (
    <div className="min-h-screen">
      {/* En-tete simple, coherent avec le reste de l'app (fond clair) */}
      <div className="sticky top-16 z-20 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-page px-6">
          <div className="flex items-baseline gap-3 py-4">
            <h1 className="text-2xl font-black tracking-tight text-ink">Data Analyse</h1>
            <span className="text-sm text-muted">Tableau de bord décisionnel — style Power BI</span>
          </div>
          <nav className="flex gap-2 pb-3" aria-label="Navigation analyste">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? tab.highlight
                        ? 'bg-violet text-white shadow-md shadow-violet/20'
                        : 'bg-eco text-white'
                      : tab.highlight
                        ? 'bg-violet/10 text-violet hover:bg-violet/20'
                        : 'bg-card2 text-muted hover:bg-eco/10 hover:text-eco'
                  }`
                }
              >
                {tab.label}
                {tab.highlight && <span className="ml-1.5 text-[9px] font-black opacity-70">NEW</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <Outlet />
    </div>
  )
}
