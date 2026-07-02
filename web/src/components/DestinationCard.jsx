import { Link } from 'react-router-dom'
import { destImage } from '../lib/images'
import { usePlaceImage } from '../lib/usePlaceImage'
import { useAuth } from '../lib/auth.jsx'
import { ecoScore, ecoColor } from '../lib/eco'

const cap = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase())

export default function DestinationCard({ dest }) {
  const ville = cap(dest.commune || dest.nom_gare)
  const img = usePlaceImage(dest.commune || dest.nom_gare, destImage(dest.commune || dest.nom_gare))
  const { user, isFavorite, toggleFavorite } = useAuth()
  const fav = isFavorite(dest.nom_gare)
  const eco = ecoScore(dest)

  return (
    <Link
      to={`/destinations/${encodeURIComponent(dest.nom_gare)}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-card shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-cardHover"
    >
      <div className="relative h-60 overflow-hidden bg-card2">
        <img
          src={img}
          alt={ville}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

        {user && (
          <button
            type="button"
            aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleFavorite(dest.nom_gare)
            }}
            className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill={fav ? '#ef4444' : 'none'}
              stroke={fav ? '#ef4444' : '#444'}
              strokeWidth="2"
            >
              <path d="M12 21s-7-4.5-9.5-8.5C.5 9 2 5.5 5.5 5.5c2 0 3.3 1.2 4 2.2.7-1 2-2.2 4-2.2C21 5.5 23.5 9 21.5 12.5 19 16.5 12 21 12 21z" />
            </svg>
          </button>
        )}

        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur"
          style={{ color: ecoColor(eco.score) }}
          title="EcoScore : CO2 evite (45%) + attractivite (30%) + activites (25%)"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
          {eco.score}
        </span>

        <div className="absolute bottom-4 left-5 right-5">
          <div className="text-[1.1rem] font-extrabold tracking-tight text-white drop-shadow">
            {ville}
          </div>
          <div className="text-xs font-medium text-white/80">{cap(dest.departement)}</div>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted">
            {dest.nb_poi_5km ? `${dest.nb_poi_5km.toLocaleString('fr-FR')} activités` : 'À découvrir'}
          </span>
          {dest.score_reco ? (
            <span className="rounded-full bg-violet/10 px-2 py-1 text-xs font-bold text-violet">
              Match {Number(dest.score_reco).toFixed(1)}/10
            </span>
          ) : (
            <span className="text-sm font-bold text-violet opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Explorer &rarr;
            </span>
          )}
        </div>
        {dest.raison && (
          <p className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-muted">
            <strong className="text-ink">Pourquoi :</strong> {dest.raison}
          </p>
        )}
      </div>
    </Link>
  )
}
