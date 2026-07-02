import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-card2 px-6 py-14 text-center">
      <div className="flex justify-center">
        <Logo textClass="text-3xl" />
      </div>
      <p className="mx-auto mt-4 max-w-md text-sm italic text-muted">
        Le tourisme en train, autrement.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm font-medium text-muted">
        <Link to="/" className="hover:text-eco">Accueil</Link>
        <Link to="/destinations" className="hover:text-eco">Destinations</Link>
        <Link to="/carte" className="hover:text-eco">Carte</Link>
        <Link to="/data-dashboard" className="hover:text-eco">Espace Analyste</Link>
        <Link to="/methodologie" className="hover:text-eco">Methodologie</Link>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-5 text-[0.7rem] font-medium text-muted/80">
        <span>Durable</span>
        <span>·</span>
        <span>Accessible</span>
        <span>·</span>
        <span>Local</span>
        <span>·</span>
        <span>Authentique</span>
        <span>·</span>
        <span>Responsable</span>
      </div>
      <p className="mt-6 text-xs text-muted/70">© 2026 Wandrail — Tous droits réservés</p>
    </footer>
  )
}
