import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-sm font-black uppercase tracking-[0.2em] text-violet">Erreur 404</div>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-ink">Cette voie ne mène nulle part</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        La page demandée n’existe pas ou a changé d’adresse. Revenez à l’accueil pour reprendre le voyage.
      </p>
      <Link to="/" className="mt-7 rounded-full bg-violet px-6 py-3 text-sm font-bold text-white hover:bg-violet-dark">
        Retour à l’accueil
      </Link>
    </div>
  )
}
