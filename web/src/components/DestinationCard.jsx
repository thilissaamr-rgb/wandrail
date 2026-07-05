import { Link } from 'react-router-dom'
import { usePlaceGallery } from '../lib/usePlaceImage'
import { useAuth } from '../lib/auth.jsx'
import { ecoScore } from '../lib/eco'
import { formatPlaceName } from '../lib/format'
import Icon from './Icon'
import PhotoCarousel from './PhotoCarousel'

export default function DestinationCard({ dest }) {
  const ville = formatPlaceName(dest.commune || dest.nom_gare)
  // Jusqu'a 3 photos Wikipedia qui alternent en fondu.
  const gallery = usePlaceGallery(dest.commune || dest.nom_gare)
  const { user, isFavorite, toggleFavorite } = useAuth()
  const fav = isFavorite(dest.nom_gare)
  const eco = ecoScore(dest)

  return (
    <Link
      to={`/destinations/${encodeURIComponent(dest.nom_gare)}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-eco/5 to-eco/15">
        {gallery.length > 0 ? (
          <PhotoCarousel images={gallery} alt={ville} interval={3200} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Icon name="train" className="h-10 w-10 text-eco/50" strokeWidth={1.5} />
            <div className="text-sm font-semibold text-eco/70">{ville}</div>
          </div>
        )}

        {user && (
          <button
            type="button"
            aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              toggleFavorite(dest.nom_gare)
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur transition hover:scale-105"
          >
            <Icon name="heart" className="h-4.5 w-4.5" strokeWidth={fav ? 0 : 2} />
            <style>{`.text-red-fav path { fill: #ef4444; stroke: #ef4444; }`}</style>
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink">{ville}</h3>
            <p className="mt-0.5 text-xs text-muted">{formatPlaceName(dest.departement)}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 rounded-md bg-eco/10 px-2 py-1 text-xs font-bold text-eco">
            <Icon name="leaf" className="h-3.5 w-3.5" />
            {eco.score}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" className="h-3.5 w-3.5" />
            {dest.nb_poi_5km ? `${dest.nb_poi_5km.toLocaleString('fr-FR')} activités` : '—'}
          </span>
          {dest.score_reco ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Icon name="star" className="h-3.5 w-3.5" />
              Match {Number(dest.score_reco).toFixed(1)}/10
            </span>
          ) : null}
        </div>

        {dest.raison && (
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            {dest.raison}
          </p>
        )}
      </div>
    </Link>
  )
}
