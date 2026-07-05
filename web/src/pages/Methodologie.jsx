import { Link } from 'react-router-dom'

function Section({ num, title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
      <div className="flex items-baseline gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet text-sm font-black text-white">
          {num}
        </span>
        <h2 className="text-xl font-black tracking-tight text-ink">{title}</h2>
      </div>
      <div className="mt-3 space-y-3 pl-0 text-sm leading-relaxed text-muted sm:pl-11">{children}</div>
    </section>
  )
}

function Code({ children }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-line bg-card2 p-3 font-mono text-xs text-ink">
      {children}
    </pre>
  )
}

export default function Methodologie() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-violet">
        Big Data &amp; IA - démarche reproductible
      </div>
      <h1 className="text-3xl font-black tracking-tighter text-ink">Méthodologie du projet</h1>
      <p className="mt-2 text-sm text-muted">
        De la donnée ouverte à la recommandation : architecture, transformations, modèles,
        évaluation et limites connues.
      </p>

      <div className="mt-8 space-y-6">
        <Section num={1} title="Périmètre et sources">
          <p>
            Wandrail couvre la <strong className="text-ink">France métropolitaine</strong>, Corse comprise.
            Les sources sont le référentiel des gares SNCF, DATAtourisme, OpenStreetMap et
            les données communales de l’API géographique de l’État (référentiel INSEE).
          </p>
          <p>
            Le Bronze conserve le flux DATAtourisme national complet. La couche Silver limite le
            périmètre aux territoires desservis par un réseau ferroviaire voyageurs. Les horaires
            et prix temps réel ne sont pas utilisés.
          </p>
        </Section>

        <Section num={2} title="Architecture et pipeline Médaillon">
          <Code>{`Sources ouvertes
  -> Bronze : réponses brutes et traçabilité d'extraction
  -> Silver : typage, filtrage ferroviaire national, dédoublonnage, géolocalisation
  -> Gold   : dimensions, agrégats, scores et features ML
  -> Modèles KMeans / KNN
  -> API FastAPI
  -> application React`}</Code>
          <p>
            PostgreSQL sépare les schémas <code>bronze</code>, <code>silver</code>,{' '}
            <code>gold</code> et <code>userapp</code>. Airflow orchestre les scripts, tandis que
            l’API ne lit que les couches Silver et Gold.
          </p>
        </Section>

        <Section num={3} title="Nettoyage et contrôles qualité">
          <ul className="list-disc space-y-1 pl-5">
            <li>unicité des gares par code UIC et dédoublonnage des POI par nom et coordonnées ;</li>
            <li>contrôle des coordonnées dans l’emprise de la France métropolitaine ;</li>
            <li>normalisation des catégories DATAtourisme et OSM ;</li>
            <li>contrôle des codes des départements métropolitains, Corse comprise ;</li>
            <li>contrôle des clés entre POI, gares, dimensions Gold et recommandations ;</li>
            <li>séparation des valeurs manquantes, invalides et simplement peu précises.</li>
          </ul>
          <p>
            Le score du dashboard combine complétude (25 %), validité (35 %), unicité (15 %)
            et intégrité (25 %). Les anomalies restent visibles même lorsque les jointures sont saines.
          </p>
        </Section>

        <Section num={4} title="Enrichissement géographique">
          <p>
            Chaque POI est associé aux trois gares les plus proches. La distance à vol d’oiseau
            est calculée avec la formule de Haversine, puis le temps de marche est estimé à 5 km/h.
          </p>
          <Code>{`d(A,B) = 2 x R x asin(sqrt(
  sin²((latB-latA)/2)
  + cos(latA) x cos(latB) x sin²((lonB-lonA)/2)
))`}</Code>
          <p>
            Cette estimation ne tient pas compte du réseau piéton, des obstacles ni de l’accessibilité PMR.
          </p>
        </Section>

        <Section num={5} title="Score d’attractivité">
          <p>Le score Gold, borné entre 0 et 10, est une somme pondérée de variables normalisées :</p>
          <Code>{`30 %  nombre de POI à moins de 2 km
25 %  nombre de POI à moins de 5 km
15 %  nombre de POI à moins de 10 km
20 %  diversité des catégories à moins de 10 km
10 %  fréquentation annuelle de la gare`}</Code>
          <p>
            Il mesure une richesse d’offre relative au jeu national. Il ne constitue ni une note
            utilisateur ni une mesure causale de l’attractivité touristique.
          </p>
        </Section>

        <Section num={6} title="KMeans : segmentation des POI">
          <p>
            KMeans clusterise les <strong className="text-ink">points d’intérêt</strong>, pas les
            profils voyageurs. Les features actuelles sont latitude, longitude, catégorie encodée
            et indicateur de popularité, toutes standardisées.
          </p>
          <p>
            Le modèle national sérialisé retient <strong className="text-ink">k = 14</strong> et un score de
            silhouette de <strong className="text-ink">0,324</strong>, calculé sur un échantillon
            d’évaluation de 5 000 POI. L’optimum est intérieur à la grille 2–15, mais les clusters
            restent dominés par l’hébergement et la restauration : l’interprétation métier demeure prudente.
          </p>
        </Section>

        <Section num={7} title="KNN : recommandations par profil">
          <p>
            Le KNN compare un vecteur de préférences à l’ensemble des destinations nationales. Les 11 features
            standardisées décrivent les volumes par catégorie à 5 km, le nombre total de POI,
            la diversité et le score d’attractivité. La distance utilisée est la distance cosinus.
          </p>
          <p>
            Cinq profils éditoriaux sont définis : Famille, Solo, Couple, Entre amis et Senior. Pour chaque
            résultat, l’API expose le rang, le score de correspondance et une justification factuelle.
          </p>
        </Section>

        <Section num={8} title="Évaluation ML">
          <p>
            La silhouette évalue la cohésion et la séparation du KMeans. Pour le KNN, les valeurs
            historiques appelées Precision@5 et Recall@5 mesurent en réalité la stabilité du top 5
            sous une perturbation de 10 % du profil synthétique.
          </p>
          <p>
            En l’absence de clics ou d’avis utilisateurs labellisés, il n’existe pas encore de vérité
            terrain permettant une vraie Precision@5 ou Recall@5 de pertinence. La prochaine étape
            est un protocole d’évaluation humaine, puis un jeu test gelé et séparé de l’entraînement.
          </p>
        </Section>

        <Section num={9} title="API, frontend et déploiement">
          <p>
            FastAPI expose des requêtes SQL paramétrées et React consomme uniquement l’API. Le frontend
            gère les états de chargement, les erreurs de données et les routes applicatives. Render
            déploie séparément le service web et l’API ; PostgreSQL reste la source de vérité.
          </p>
        </Section>

        <Section num={10} title="Limites et perspectives">
          <ul className="list-disc space-y-1 pl-5">
            <li>15 % des POI restent classés « Autre » et doivent être recatégorisés ;</li>
            <li>l’indicateur DATAtourisme stocké comme note n’est pas une note utilisateur ;</li>
            <li>les événements de démonstration doivent être remplacés par une source réelle ;</li>
            <li>les lignes ferroviaires et la météo ne sont pas encore alimentées ;</li>
            <li>les distances Haversine doivent être complétées par des temps de trajet réels ;</li>
            <li>l’évaluation KNN doit utiliser des jugements humains ou des interactions anonymisées ;</li>
            <li>la généralisation à la France entière nécessite des tests de charge et de dérive.</li>
          </ul>
        </Section>
      </div>

      <div className="mt-10 rounded-2xl border border-violet bg-violet/5 p-6 text-center">
        <p className="text-sm text-muted">Consulter les contrôles calculés sur la base courante :</p>
        <Link
          to="/data-dashboard"
          className="mt-3 inline-flex rounded-full bg-violet px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-dark"
        >
          Tableau de bord données &rarr;
        </Link>
      </div>
    </div>
  )
}
