import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import LoginModal from './LoginModal'
import { useTheme } from '../lib/theme.jsx'
import { useAuth } from '../lib/auth.jsx'

export default function Navbar() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()

  const links = [
    { to: '/', label: 'Accueil', end: true },
    { to: '/destinations', label: 'Destinations' },
    { to: '/carte', label: 'Carte' },
    ...(user ? [{ to: '/favoris', label: 'Favoris' }] : []),
  ]

  const linkClass = ({ isActive }) =>
    `flex h-16 items-center border-b-[3px] px-4 text-sm font-semibold transition-colors ${
      isActive ? 'border-violet text-violet' : 'border-transparent text-muted hover:text-violet'
    }`

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr]">
          {/* Gauche : logo */}
          <Link to="/" className="justify-self-start" onClick={() => setMenuOpen(false)}>
            <Logo textClass="text-xl sm:text-2xl" />
          </Link>

          {/* Milieu : navigation (desktop) */}
          <nav className="hidden items-center gap-1 justify-self-center md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Droite : theme + connexion + burger */}
          <div className="flex items-center gap-2 justify-self-end">
            <button
              onClick={toggle}
              aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-violet hover:text-violet"
            >
              {dark ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>

            {/* Connexion / compte (desktop) */}
            {user ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="inline-flex items-center gap-2 rounded-full border border-line py-1.5 pl-1.5 pr-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet text-xs font-bold text-white">
                    {user.pseudo?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <span className="text-sm font-semibold text-ink">{user.pseudo}</span>
                </span>
                <button
                  onClick={logout}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-violet hover:text-violet"
                >
                  Deconnexion
                </button>
              </div>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="hidden items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet/30 ring-1 ring-violet/20 transition hover:bg-violet-dark hover:shadow-violet/50 md:inline-flex"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
                </svg>
                Se connecter
              </button>
            )}

            {/* Burger (mobile) */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-violet md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Panneau mobile */}
        {menuOpen && (
          <div className="border-t border-line bg-card px-4 py-3 md:hidden">
            <nav className="flex flex-col">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 text-base font-semibold transition-colors ${
                      isActive ? 'bg-violet/10 text-violet' : 'text-ink hover:bg-card2'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 border-t border-line pt-3">
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet text-sm font-bold text-white">
                      {user.pseudo?.[0]?.toUpperCase() || 'U'}
                    </span>
                    <span className="text-sm font-semibold text-ink">{user.pseudo}</span>
                  </span>
                  <button
                    onClick={() => {
                      logout()
                      setMenuOpen(false)
                    }}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted"
                  >
                    Deconnexion
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLoginOpen(true)
                    setMenuOpen(false)
                  }}
                  className="w-full rounded-xl bg-violet py-3 text-sm font-bold text-white"
                >
                  Se connecter
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
