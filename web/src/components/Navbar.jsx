import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import LoginModal from './LoginModal'
import { useTheme } from '../lib/theme.jsx'
import { useAuth } from '../lib/auth.jsx'
import Icon from './Icon'

export default function Navbar() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()

  const links = [
    { to: '/', label: 'Accueil', end: true },
    { to: '/destinations', label: 'Explorer' },
    { to: '/carte', label: 'Carte' },
  ]

  const linkClass = ({ isActive }) =>
    `flex h-16 items-center border-b-[2px] px-4 text-sm font-semibold transition-colors ${
      isActive ? 'border-eco text-eco' : 'border-transparent text-muted hover:text-ink'
    }`

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr]">
          {/* Logo */}
          <Link to="/" className="justify-self-start" onClick={() => setMenuOpen(false)}>
            <Logo textClass="text-xl sm:text-2xl" />
          </Link>

          {/* Nav (desktop) */}
          <nav className="hidden items-center gap-1 justify-self-center md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 justify-self-end">
            {/* Bascule theme */}
            <button
              onClick={toggle}
              aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:bg-card2 hover:text-ink"
            >
              <Icon name={dark ? 'sun' : 'moon'} className="h-5 w-5" />
            </button>

            {/* Utilisateur */}
            {user ? (
              <Link
                to="/profil"
                aria-label="Mon compte"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-eco text-sm font-bold text-white transition hover:bg-eco-dark"
                title={user.pseudo}
              >
                {user.pseudo?.[0]?.toUpperCase() || 'U'}
              </Link>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="hidden items-center gap-2 rounded-lg bg-eco px-4 py-2 text-sm font-semibold text-white transition hover:bg-eco-dark md:inline-flex"
              >
                <Icon name="user" className="h-4 w-4" />
                Se connecter
              </button>
            )}

            {/* Burger (mobile) */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-card2 md:hidden"
            >
              <Icon name={menuOpen ? 'x' : 'menu'} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Menu mobile */}
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
                      isActive ? 'bg-eco/10 text-eco' : 'text-ink hover:bg-card2'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {user && (
                <NavLink
                  to="/profil"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-3 text-base font-semibold ${
                      isActive ? 'bg-eco/10 text-eco' : 'text-ink hover:bg-card2'
                    }`
                  }
                >
                  Mon compte
                </NavLink>
              )}
            </nav>
            {!user && (
              <div className="mt-3 border-t border-line pt-3">
                <button
                  onClick={() => {
                    setLoginOpen(true)
                    setMenuOpen(false)
                  }}
                  className="w-full rounded-lg bg-eco py-3 text-sm font-bold text-white"
                >
                  Se connecter
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
