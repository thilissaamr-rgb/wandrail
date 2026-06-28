import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import LoginModal from './LoginModal'
import { useTheme } from '../lib/theme.jsx'
import { useAuth } from '../lib/auth.jsx'

export default function Navbar() {
  const [loginOpen, setLoginOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()

  const links = [
    { to: '/', label: 'Accueil', end: true },
    { to: '/destinations', label: 'Destinations' },
    { to: '/carte', label: 'Carte' },
    ...(user ? [{ to: '/favoris', label: 'Favoris' }] : []),
  ]

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-page grid-cols-[1fr_auto_1fr] items-center px-6">
          {/* Gauche : logo */}
          <Link to="/" className="justify-self-start">
            <Logo textClass="text-2xl" />
          </Link>

          {/* Milieu : navigation */}
          <nav className="hidden items-center gap-1 justify-self-center md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex h-16 items-center border-b-[3px] px-4 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-violet text-violet'
                      : 'border-transparent text-muted hover:text-violet'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Droite : theme + connexion */}
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
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 rounded-full border border-line py-1.5 pl-1.5 pr-3 sm:inline-flex">
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
                className="inline-flex items-center gap-2 rounded-full bg-violet px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet/30 ring-1 ring-violet/20 transition hover:bg-violet-dark hover:shadow-violet/50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
                </svg>
                <span className="hidden sm:inline">Se connecter</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
