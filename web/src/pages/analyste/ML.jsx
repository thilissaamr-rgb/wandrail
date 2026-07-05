import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { AnalystError, AnalystHeading, AnalystKpi, AnalystLoading, MiniBar, fmt } from '../../components/AnalystUI'

export default function AnalystML() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => { api.mlMetrics().then(setData).catch(() => setError(true)) }, [])
  if (error) return <AnalystError />
  if (!data) return <AnalystLoading />
  const maxCluster = Math.max(...data.kmeans.distribution.map((item) => item.nb_poi), 1)

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <AnalystHeading eyebrow="IA & Recommandations" title="Des modèles simples, explicables et évalués honnêtement" description="Wandrail utilise KMeans pour explorer la structure des POI et KNN pour rapprocher les destinations des préférences éditoriales." />
      <div className="grid gap-4 sm:grid-cols-3">
        <AnalystKpi label="Clusters KMeans" value={data.kmeans.n_clusters} sub={`grille k=${data.kmeans.grid[0]} à ${data.kmeans.grid[1]}`} />
        <AnalystKpi label="Silhouette" value={Number(data.kmeans.silhouette).toFixed(3)} sub={data.kmeans.interpretation} tone="amber" />
        <AnalystKpi label="Precision@5 / Recall@5" value="N/D" sub="aucune vérité terrain utilisateur" tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-xl font-black text-ink">KMeans - structure des POI</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{data.kmeans.objective}</p>
          <h4 className="mt-5 text-xs font-black uppercase tracking-wider text-muted">Features</h4>
          <div className="mt-2 flex flex-wrap gap-2">{data.kmeans.features.map((item) => <span key={item} className="rounded-full bg-violet/10 px-3 py-1 text-xs font-bold text-violet">{item}</span>)}</div>
          <h4 className="mt-5 text-xs font-black uppercase tracking-wider text-muted">Préprocessing</h4>
          <ul className="mt-2 space-y-1 text-sm text-ink">{data.kmeans.preprocessing.map((item) => <li key={item}>✓ {item}</li>)}</ul>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Limite : {data.kmeans.limitation}</div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-xl font-black text-ink">KNN - recommandation</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{data.knn.objective}</p>
          <h4 className="mt-5 text-xs font-black uppercase tracking-wider text-muted">Features</h4>
          <ul className="mt-2 space-y-1 text-sm text-ink">{data.knn.features.map((item) => <li key={item}>• {item}</li>)}</ul>
          <h4 className="mt-5 text-xs font-black uppercase tracking-wider text-muted">Préprocessing</h4>
          <div className="mt-2 flex flex-wrap gap-2">{data.knn.preprocessing.map((item) => <span key={item} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{item}</span>)}</div>
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">{data.knn.evaluation_status} La stabilité@5 mesure seulement la robustesse du classement sous perturbation.</div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-lg font-black text-ink">Distribution des clusters</h3>
          <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto pr-2">
            {data.kmeans.distribution.map((item) => <MiniBar key={`${item.cluster_id}-${item.cluster_nom}`} label={item.cluster_nom} value={item.nb_poi} max={maxCluster} detail={`${fmt(item.nb_poi)} POI`} />)}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
          <h3 className="text-lg font-black text-ink">Stabilité@5 par profil</h3>
          <p className="mt-1 text-xs text-muted">Recouvrement du top 5 après perturbation de 10 % du vecteur profil.</p>
          <div className="mt-5 space-y-5">
            {Object.entries(data.knn.metrics_by_profile).map(([profile, metrics]) => (
              <MiniBar key={profile} label={profile} value={(metrics.stability_at_5 || 0) * 100} max={100} detail={`${Math.round((metrics.stability_at_5 || 0) * 100)}%`} />
            ))}
          </div>
          <div className="mt-6 rounded-xl bg-card2 p-4 text-xs leading-relaxed text-muted"><strong className="text-ink">Pour obtenir Precision@5 et Recall@5 :</strong> constituer un jeu test séparé avec des jugements humains profil-destination ou des interactions utilisateurs anonymisées.</div>
        </section>
      </div>
    </div>
  )
}
