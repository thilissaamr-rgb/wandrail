import { Link } from 'react-router-dom'
import { usePlaceGallery, extractFallbackCity } from '../lib/usePlaceImage'
import { useAuth } from '../lib/auth.jsx'
import { ecoScore } from '../lib/eco'
import { formatPlaceName } from '../lib/format'
import Icon from './Icon'
import PhotoCarousel from './PhotoCarousel'

// Choix du badge unique le plus pertinent, base sur les donnees dispos.
// Priorite : Bas carbone > Tres populaire > Ideal famille > Nouveau > null.
function chooseBadge(dest, eco) {
  const scoreEco = Number(eco?.score) || 0
  const nbPoi = Number(dest.nb_poi_5km) || 0
  const scoreReco = Number(dest.score_reco) || 0
  if (scoreEco >= 85) return { label: 'Bas carbone', color: 'bg-emerald-500', icon: 'leaf' }
  if (nbPoi >= 300) return { label: 'Très populaire', color: 'bg-rose-500', icon: 'star' }
  if (nbPoi >= 120 && scoreReco >= 7) return { label: 'Idéal famille', color: 'bg-sky-500', icon: 'users' }
  if (scoreReco >= 8) return { label: 'Coup de cœur', color: 'bg-amber-500', icon: 'heart' }
  return null
}

// Estime approximative des stats a partir des donnees dispos.
// Ne s'affiche que si la donnee est presente.
function extractStats(dest) {
  return {
    restos: dest.nb_restaurants ?? dest.nb_resto ?? null,
    hotels: dest.nb_hebergements ?? dest.nb_hotels ?? null,
    activites: dest.nb_poi_5km ?? dest.nb_activites ?? null,
    tempsTrain: dest.temps_train_min ?? dest.temps_trajet_min ?? null,
    co2Evite: dest.co2_evite_kg ?? null,
  }
}

export default function DestinationCard({ dest }) {
  const ville = formatPlaceName(dest.commune || dest.nom_gare)
  const fallbackCity = extractFallbackCity(dest.nom_gare, dest.departement)
  const gallery = usePlaceGallery(dest.commune || dest.nom_gare, fallbackCity)
  const { user, isFavorite, toggleFavorite } = useAuth()
  const fav = isFavorite(dest.nom_gare)
  const eco = ecoScore(dest)
  const badge = chooseBadge(dest, eco)
  const stats = extractStats(dest)

  return (
    <Link
      to={`/destinations/${encodeURIComponent(dest.nom_gare)}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-eco/40 hover:shadow-xl"
    >
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-eco/5 to-eco/15">
        {gallery.length > 0 ? (
          <PhotoCarousel images={gallery} alt={ville} interval={4200} showIndicators={false} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Icon name="train" className="h-10 w-10 text-eco/50" strokeWidth={1.5} />
            <div className="text-sm font-semibold text-eco/70">{ville}</div>
          </div>
        )}

        {/* Gradient bas pour badge Wandrail Score + temps train */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

        {/* Badge dynamique haut gauche */}
        {badge && (
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full ${badge.color} px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md ring-1 ring-white/20`}
          >
            <Icon name={badge.icon} className="h-3 w-3" />
            {badge.label}
          </span>
        )}

        {/* Wandrail Score bas gauche */}
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-eco shadow-sm backdrop-blur">
          <Icon name="leaf" className="h-3 w-3" />
          {eco.score}
          <span className="text-[9px] font-semibold text-eco/70">Wandrail</span>
        </div>

        {/* Temps de trajet train bas droite */}
        {stats.tempsTrain != null && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-slate-800 shadow-sm backdrop-blur">
            <Icon name="train" className="h-3 w-3" />
            {stats.tempsTrain} min
          </div>
        )}

        {/* Favori */}
        {user && (
          <button
            type="button"
            aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              toggleFavorite(dest.nom_gare)
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur transition hover:scale-110 active:scale-95"
          >
            <Icon
              name="heart"
              className={`h-4.5 w-4.5 ${fav ? 'text-rose-500' : 'text-slate-700'}`}
              strokeWidth={fav ? 0 : 2}
            />
            {fav && (
              <style>{`.hcurrent path{fill:#f43f5e;stroke:#f43f5e}`}</style>
            )}
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink">{ville}</h3>
            <p className="mt-0.5 text-xs text-muted">{formatPlaceName(dest.departement)}</p>
          </div>
          {dest.score_reco ? (
            <div className="flex flex-shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Icon name="star" className="h-3.5 w-3.5" />
              {Number(dest.score_reco).toFixed(1)}
            </div>
          ) : null}
        </div>

        {/* Stats icones — restos / hebergements / activites / CO2 */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px] text-muted">
          <StatCell icon="wine" value={stats.restos} label="restos" />
          <StatCell icon="pin" value={stats.hotels} label="hôtels" />
          <StatCell icon="star" value={stats.activites} label="lieux" />
          <StatCell icon="leaf" value={stats.co2Evite} label="kg" ecoColor />
        </div>

        {dest.raison && (
          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted line-clamp-2">
            {dest.raison}
          </p>
        )}
      </div>
    </Link>
  )
}

function StatCell({ icon, value, label, ecoColor = false }) {
  if (value == null || value === '') {
    return (
      <div className="flex flex-col items-center gap-0.5 rounded-lg bg-card2 py-1.5 opacity-40">
        <Icon name={icon} className="h-3.5 w-3.5" />
        <span className="text-[9px]">—</span>
      </div>
    )
  }
  const shown = typeof value === 'number' && value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : Number(value).toLocaleString('fr-FR')
  return (
    <div
      className={`flex flex-col items-center gap-0.5 rounded-lg bg-card2 py-1.5 transition group-hover:bg-card2/70 ${
        ecoColor ? 'text-eco' : 'text-ink'
      }`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      <span className="text-[10px] font-bold">{shown}</span>
      <span className="text-[8px] text-muted">{label}</span>
    </div>
  )
}
