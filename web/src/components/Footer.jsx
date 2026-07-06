import { Link } from 'react-router-dom'
import Logo from './Logo'
import Icon from './Icon'

const COLUMNS = [
  {
    title: 'Explorer',
    links: [
      { to: '/', label: 'Accueil' },
      { to: '/destinations', label: 'Destinations' },
      { to: '/carte', label: 'Carte interactive' },
      { to: '/mon-voyage', label: 'Mon voyage' },
      { to: '/favoris', label: 'Favoris' },
    ],
  },
  {
    title: 'Data',
    links: [
      { to: '/analyste', label: 'Data Analyse' },
      { to: '/analyste/tourisme', label: 'Tourisme' },
      { to: '/analyste/carbone', label: 'Impact carbone' },
      { to: '/analyste/profils', label: 'Profils voyageurs' },
    ],
  },
  {
    title: 'À propos',
    links: [
      { to: '/a-propos', label: 'Le projet' },
      { href: 'https://github.com/', label: 'Code source', external: true, icon: 'star' },
      { to: '/mentions-legales', label: 'Mentions légales' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Valeurs',
    tags: ['Durable', 'Accessible', 'Local', 'Authentique', 'Responsable'],
  },
]

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card2">
      <div className="mx-auto max-w-page px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          {/* Colonne marque */}
          <div>
            <Logo textClass="text-2xl" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Voyager autrement grâce aux données.
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted/80">
              Des destinations accessibles en train, sélectionnées pour leur richesse
              culturelle, gastronomique et naturelle.
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href="https://github.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:border-eco hover:text-eco"
              >
                <Icon name="star" className="h-4 w-4" />
              </a>
              <Link
                to="/contact"
                aria-label="Contact"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-muted transition hover:border-eco hover:text-eco"
              >
                <Icon name="pin" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Colonnes de liens */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-black uppercase tracking-wider text-ink">{col.title}</div>
              {col.links && (
                <ul className="mt-4 space-y-2.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.to || l.href}>
                      {l.external ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-muted transition hover:text-eco"
                        >
                          {l.label}
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <Link to={l.to} className="text-muted transition hover:text-eco">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {col.tags && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {col.tags.map((t) => (
                    <li
                      key={t}
                      className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold text-muted"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Ligne basse */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted/80 md:flex-row">
          <p>© 2026 Wandrail — Tous droits réservés</p>
          <p className="italic">Voyager autrement grâce aux données.</p>
          <p>
            Projet M1 BDIA · <span className="font-semibold">Open Data</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
