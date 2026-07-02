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
      <div className="mt-3 space-y-3 pl-11 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  )
}

function Code({ children }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-line bg-card2 p-3 text-xs font-mono text-ink">
      {children}
    </pre>
  )
}

export default function Methodologie() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-violet">
        Big Data &amp; IA
      </div>
      <h1 className="text-3xl font-black tracking-tighter text-ink">Methodologie du projet</h1>
      <p className="mt-2 text-sm text-muted">
        De la donnee ouverte a la recommandation personnalisee : pipeline, modeles, choix
        techniques et limites.
      </p>

      <div className="mt-8 space-y-6">
        <Section num={1} title="Sources de donnees">
          <p>
            Le projet croise <strong className="text-ink">quatre jeux de donnees ouvertes</strong>{' '}
            complementaires :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">SNCF Open Data</strong> : referentiel des gares
              (code UIC, coordonnees, frequentation).
            </li>
            <li>
              <strong className="text-ink">DATAtourisme</strong> : 26 000+ points d'interet
              touristiques normalises (categorie, adresse, description).
            </li>
            <li>
              <strong className="text-ink">OpenStreetMap</strong> : geometries et enrichissement
              geographique.
            </li>
            <li>
              <strong className="text-ink">INSEE</strong> : donnees demographiques et
              administratives des communes.
            </li>
          </ul>
        </Section>

        <Section num={2} title="Architecture Medaillon (Bronze / Silver / Gold)">
          <p>
            L'ingestion suit le pattern <strong className="text-ink">Medaillon</strong> pour
            garantir la tracabilite et la qualite :
          </p>
          <Code>{`bronze/  donnees brutes (CSV / JSON / API) - aucune transformation
silver/  donnees nettoyees + typees + geolocalisees
         silver.gares         (136 lignes)
         silver.poi           (26 099 lignes)
         silver.poi_enrichi   (distance_gare_km, temps_marche_min)
gold/    donnees business, agregats et features ML
         gold.dim_gare        (score_attractivite, profil_touristique)
         gold.dim_profil      (5 profils voyageur)
         gold.recommandations (top 5 destinations par profil)`}</Code>
          <p>
            Chaque etape est reproductible via un script Python dedie
            (<code className="text-xs">scripts/01_gares.py</code>,
            <code className="text-xs"> 05_gold_layer.py</code>, etc.), orchestrable dans un DAG
            Airflow.
          </p>
        </Section>

        <Section num={3} title="Enrichissement geographique">
          <p>
            Pour chaque POI on calcule sa <strong className="text-ink">distance a la gare</strong>{' '}
            la plus proche par la formule de haversine (grand cercle) :
          </p>
          <Code>{`d(A, B) = 2·R·arcsin( sqrt(
    sin²((φB - φA)/2)
  + cos(φA)·cos(φB)·sin²((λB - λA)/2)
))`}</Code>
          <p>
            Le temps de marche est deduit d'une vitesse moyenne de{' '}
            <strong className="text-ink">5 km/h</strong> (12 min/km), coherente avec les
            recommandations OMS pour un pieton urbain.
          </p>
        </Section>

        <Section num={4} title="Scoring d'attractivite">
          <p>
            Chaque gare recoit un <strong className="text-ink">score d'attractivite (0-10)</strong>{' '}
            calcule dans <code className="text-xs">gold.dim_gare</code> a partir de plusieurs
            signaux :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>nombre de POI dans un rayon de 5 km ;</li>
            <li>diversite (nombre de categories distinctes) ;</li>
            <li>densite touristique par km² ;</li>
            <li>note moyenne des POI (quand disponible).</li>
          </ul>
        </Section>

        <Section num={5} title="EcoScore : indice composite visible">
          <p>
            Pour chaque destination, l'application calcule et affiche un{' '}
            <strong className="text-ink">EcoScore (0-100)</strong> pondere :
          </p>
          <Code>{`EcoScore = 100 × (0.45·C + 0.30·A + 0.25·R)

C = CO2 evite en train vs voiture (kg, aller-retour) / 80
A = score d'attractivite / 10
R = nombre de POI a 5 km / 500`}</Code>
          <p>
            Le CO2 evite utilise le facteur ADEME de{' '}
            <strong className="text-ink">218 g/km</strong> pour la voiture et le ratio de{' '}
            <strong className="text-ink">-91%</strong> pour le train, sur un aller-retour depuis
            le hub regional (Nantes). Chaque composante est visible et decomposee dans
            l'interface, garantissant la transparence de la note.
          </p>
        </Section>

        <Section num={6} title="Clustering (KMeans)">
          <p>
            Les <strong className="text-ink">5 profils voyageur</strong> (Famille, Solo, Couple,
            Groupe, Eco) ont ete identifies par clustering{' '}
            <strong className="text-ink">KMeans</strong> sur les caracteristiques des
            destinations (nb POI, categories dominantes, densite, accessibilite train).
          </p>
        </Section>

        <Section num={7} title="Recommandation (KNN)">
          <p>
            Pour chaque profil, un modele <strong className="text-ink">KNN</strong> (k-Nearest
            Neighbors) selectionne les <strong className="text-ink">5 destinations les plus
            similaires</strong> au centroide du cluster, materialisees dans{' '}
            <code className="text-xs">gold.recommandations</code>.
          </p>
          <p>
            L'endpoint <code className="text-xs">GET /api/recommandations/{'{profil}'}</code>{' '}
            renvoie ces destinations, integrees dans la page{' '}
            <Link to="/destinations" className="font-semibold text-violet hover:underline">
              /destinations
            </Link>
            .
          </p>
        </Section>

        <Section num={8} title="Stack technique">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-ink">PostgreSQL</strong> : base relationnelle, 3 schemas
              medaillon.
            </li>
            <li>
              <strong className="text-ink">FastAPI</strong> (Python) : API REST, requetes
              parametrees, CORS, hachage pbkdf2 pour l'auth.
            </li>
            <li>
              <strong className="text-ink">React + Vite + Tailwind</strong> : SPA moderne,
              mode sombre, animations sobres.
            </li>
            <li>
              <strong className="text-ink">Leaflet + OSRM</strong> : cartographie et calcul
              d'itineraire pieton reel.
            </li>
            <li>
              <strong className="text-ink">Render</strong> : deploiement continu depuis GitHub.
            </li>
          </ul>
        </Section>

        <Section num={9} title="Limites et perspectives">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Perimetre actuel : <strong className="text-ink">Pays de la Loire</strong> (136
              gares, 26 099 POI). L'architecture est pensee pour la France entiere : ajouter
              une region = relancer les pipelines, sans toucher au code.
            </li>
            <li>
              Le <strong className="text-ink">score d'attractivite</strong> ne pondere pas
              encore la saisonnalite ni les avis utilisateurs.
            </li>
            <li>
              Le calcul CO2 utilise des moyennes ADEME ; un affinement par type de train
              (TER vs TGV) est possible.
            </li>
            <li>
              Prochaine etape : brancher les horaires SNCF en temps reel via l'API Navitia.
            </li>
          </ul>
        </Section>
      </div>

      <div className="mt-10 rounded-2xl border border-violet bg-violet/5 p-6 text-center">
        <p className="text-sm text-muted">
          Voir les indicateurs data en temps reel :
        </p>
        <Link
          to="/data-dashboard"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-dark"
        >
          Tableau de bord donnees &rarr;
        </Link>
      </div>
    </div>
  )
}
