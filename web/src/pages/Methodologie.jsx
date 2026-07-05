import { Link } from 'react-router-dom'

function Block({ title, text }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
    </section>
  )
}

export default function Methodologie() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Méthodologie</h1>
        <p className="mt-1 text-sm text-muted">
          Vue simple de la chaîne data et des modèles.
        </p>
      </div>

      <div className="grid gap-5">
        <Block
          title="Sources"
          text="Le projet croise les gares SNCF, DATAtourisme, OpenStreetMap et des référentiels géographiques nationaux."
        />
        <Block
          title="Pipeline"
          text="Le Bronze conserve les flux bruts. Le Silver nettoie et normalise. Le Gold produit les scores, agrégats et features utilisées par l’application."
        />
        <Block
          title="Qualité"
          text="Les contrôles portent sur les doublons, les coordonnées, les jointures, les catégories et les valeurs manquantes."
        />
        <Block
          title="Scoring"
          text="Le score d’attractivité combine la densité de lieux, leur diversité et la fréquentation de la gare."
        />
        <Block
          title="KMeans"
          text="KMeans segmente les points d’intérêt pour mieux lire la structure de l’offre touristique."
        />
        <Block
          title="KNN"
          text="KNN rapproche les destinations des profils voyageurs à partir de features standardisées."
        />
        <Block
          title="Limites"
          text="L’évaluation des recommandations doit encore être renforcée par des retours humains ou des usages réels anonymisés."
        />
      </div>

      <div className="mt-8">
        <Link to="/data-dashboard" className="text-sm font-semibold text-eco hover:underline">
          Voir le tableau de bord
        </Link>
      </div>
    </div>
  )
}
