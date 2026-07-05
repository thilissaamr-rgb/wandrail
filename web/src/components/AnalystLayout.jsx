import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/analyste', label: 'Vue d’ensemble', end: true },
  { to: '/analyste/data-quality', label: 'Qualité des données' },
  { to: '/analyste/pipeline', label: 'Pipeline' },
  { to: '/analyste/ml', label: 'Modèles' },
  { to: '/analyste/decision', label: 'Territoires' },
]

export default function AnalystLayout() {
  return (
    <div>
      {/* En-tete sobre : fond blanc, texte noir, sans gradient */}
      <section className="border-b border-line bg-card">
        <div className="mx-auto max-w-page px-6 py-8">
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Statistiques et indicateurs de la plateforme Wandrail : qualité des données, pipeline,
            modèles et territoires accessibles en train.
          </p>
        </div>
      </section>

      {/* Onglets simples, style Notion */}
      <div className="sticky top-16 z-40 border-b border-line bg-card/95 backdrop-blur">
        <nav
          className="no-scrollbar mx-auto flex max-w-page gap-1 overflow-x-auto px-4 sm:px-6"
          aria-label="Navigation analyste"
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
                  isActive ? 'border-eco text-eco' : 'border-transparent text-muted hover:text-ink'
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
