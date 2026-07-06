import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { api } from '../lib/api'
import { usePlaceGallery } from '../lib/usePlaceImage'
import { formatPlaceName } from '../lib/format'
import PhotoCarousel from '../components/PhotoCarousel'
import Icon from '../components/Icon'

// Espace "Mon voyage" : agrege les favoris de l'utilisateur en carte-voyage
// (destination, dates simulees, restos/hebergements/activites, CO2, budget).
export default function MonVoyage() {
  const { user, favorites } = useAuth()
  const [dests, setDests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    const list = Array.from(favorites)
    if (!list.length) {
      setDests([])
      setLoading(false)
      return
    }
    Promise.all(list.slice(0, 6).map((nom) => api.destination(nom).catch(() => null)))
      .then((rows) => setDests(rows.filter(Boolean)))
      .finally(() => setLoading(false))
  }, [user, favorites])

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-3xl border border-line bg-card p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-eco/10 text-eco">
            <Icon name="ticket" className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-ink">Mon voyage</h1>
          <p className="mt-2 text-sm text-muted">
            Connectez-vous pour préparer votre prochain voyage, ajouter des activités, garder vos hébergements et suivre votre impact carbone.
          </p>
          <Link
            to="/destinations"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-eco px-5 py-3 text-sm font-bold text-white hover:bg-eco-dark"
          >
            Explorer les destinations <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-page px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-eco">Espace personnel</p>
        <h1 className="mt-2 text-3xl font-black text-ink sm:text-4xl">Mon voyage</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Toutes vos destinations enregistrées, prêtes à devenir votre prochain voyage.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-64 animate-pulse rounded-2xl bg-card2" />
          ))}
        </div>
      ) : dests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-card p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-eco/10 text-eco">
            <Icon name="heart" className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-black text-ink">Aucun voyage en préparation</h2>
          <p className="mt-1 text-sm text-muted">
            Ajoutez une destination à vos favoris depuis la fiche pour la retrouver ici.
          </p>
          <Link
            to="/destinations"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-eco px-5 py-3 text-sm font-bold text-white hover:bg-eco-dark"
          >
            Trouver une destination <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {dests.map((d) => (
            <TripCard key={d.gare?.nom_gare || d.nom_gare} dest={d} />
          ))}
        </div>
      )}
    </div>
  )
}

function TripCard({ dest }) {
  const gare = dest.gare || dest
  const ville = formatPlaceName(gare.commune || gare.nom_gare)
  const gallery = usePlaceGallery(gare.commune || gare.nom_gare)
  const nbRestos = (dest.lieux || []).filter((p) => /restaurant|resto/i.test(p.categorie || '')).length
  const nbHotels = (dest.lieux || []).filter((p) => /hebergement|hotel|logement/i.test(p.categorie || '')).length
  const nbActivites = (dest.lieux || []).length
  const co2 = Math.round((gare.co2_evite_kg || 84))
  const budget = Math.round((gare.distance_paris_km || 500) * 0.12 + 60)

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
      <div className="relative h-52 bg-eco/5">
        {gallery.length > 0 ? (
          <PhotoCarousel images={gallery} alt={ville} interval={3800} />
        ) : (
          <div className="flex h-full items-center justify-center text-eco/60">
            <Icon name="train" className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-eco shadow">
          En préparation
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-ink">{ville}</h3>
            <p className="text-xs text-muted">{formatPlaceName(gare.departement)}</p>
          </div>
          <div className="rounded-lg bg-eco/10 px-2.5 py-1 text-xs font-bold text-eco">
            −{co2} kg CO₂
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Restos" value={nbRestos} icon="wine" />
          <Stat label="Hôtels" value={nbHotels} icon="hotel" />
          <Stat label="Activités" value={nbActivites} icon="activity" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Info label="Budget estimé" value={`≈ ${budget} €`} />
          <Info label="Prévisions" value="Ensoleillé 21°" />
        </div>

        <div className="mt-5 flex gap-2">
          <Link
            to={`/destinations/${encodeURIComponent(gare.nom_gare)}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-eco px-4 py-2.5 text-sm font-bold text-white hover:bg-eco-dark"
          >
            Composer ce voyage <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
          <button
            className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-xs font-bold text-ink hover:bg-card2"
            title="Télécharger un récapitulatif PDF (depuis la fiche destination)"
          >
            <Icon name="download" className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }) {
  return (
    <div className="rounded-xl bg-card2 py-2.5">
      <div className="mx-auto flex h-6 w-6 items-center justify-center text-eco">
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="mt-0.5 text-sm font-black text-ink">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-ink">{value}</div>
    </div>
  )
}
