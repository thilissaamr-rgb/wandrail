import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Icon from '../../components/Icon'

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')

export default function AnalystML() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    api.mlMetrics().then(setData).catch(() => setErr(true))
  }, [])

  if (err) return <Err />
  if (!data) return <Skel />

  const silhouette = data.kmeans?.silhouette || 0
  const bestK = data.kmeans?.best_k || data.kmeans?.n_clusters || 14
  const distribution = (data.kmeans?.distribution || []).slice(0, 6)
  const maxCluster = Math.max(...distribution.map(d => d.nb_poi || 0), 1)
  const profiles = Object.entries(data.knn?.metrics_by_profile || {})

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      {/* HERO ML : 2 gros indicateurs */}
      <section className="grid gap-4 md:grid-cols-2">
        <Gauge
          title="Qualité de regroupement"
          subtitle="Score silhouette (KMeans)"
          value={silhouette}
          max={1}
          color="#0A5C36"
          detail="Sur l'ensemble des points d'intérêt du périmètre"
        />
        <StabilityCard profiles={profiles} />
      </section>

      {/* Comment ça marche : 3 étapes visuelles */}
      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-lg font-black text-ink">Comment on recommande une destination</h2>
        <p className="mt-1 text-xs text-muted">3 étapes simples derrière chaque suggestion</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Step
            n={1}
            icon="map"
            title="On regroupe les lieux"
            text={`${bestK} groupes de points d'intérêt selon leur position et leur catégorie`}
            color="#0A5C36"
          />
          <Step
            n={2}
            icon="user"
            title="On lit votre profil"
            text="Vos envies, votre type de voyage, votre budget carbone"
            color="#1F6FEB"
          />
          <Step
            n={3}
            icon="star"
            title="On matche"
            text="Les 5 destinations les plus proches de votre profil (KNN)"
            color="#E76F51"
          />
        </div>
      </section>

      {/* Distribution des clusters : barres horizontales colorées */}
      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-lg font-black text-ink">Répartition des activités</h2>
        <p className="mt-1 text-xs text-muted">Top 6 des groupes détectés par le modèle</p>
        <div className="mt-6 space-y-3">
          {distribution.map((c, i) => (
            <ClusterBar
              key={c.cluster_id ?? i}
              rank={i + 1}
              name={c.cluster_nom || `Cluster ${c.cluster_id}`}
              count={c.nb_poi}
              max={maxCluster}
              color={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
            />
          ))}
        </div>
      </section>

      {/* Métriques par profil voyageur */}
      {profiles.length > 0 && (
        <section className="mt-8 rounded-2xl border border-line bg-card p-6">
          <h2 className="text-lg font-black text-ink">Stabilité par profil voyageur</h2>
          <p className="mt-1 text-xs text-muted">Sur 10 essais, dans quelle mesure les recommandations restent cohérentes</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {profiles.map(([profil, metrics]) => (
              <ProfilCard
                key={profil}
                profil={profil}
                stability={Math.round((metrics.stability_at_5 || 0) * 100)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

const CLUSTER_COLORS = ['#0A5C36', '#1F6FEB', '#E76F51', '#8B5CF6', '#F59E0B', '#10B981']

// ─── Composants graphiques ────────────────

function Gauge({ title, subtitle, value, max, color, detail }) {
  const pct = Math.min(100, (value / max) * 100)
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-wider text-muted">{title}</div>
          <div className="mt-0.5 text-xs text-muted">{subtitle}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-6">
        <div className="relative h-32 w-32 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="45" stroke="var(--line)" strokeWidth="8" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-ink">{value.toFixed(3)}</div>
            <div className="text-[0.6rem] text-muted">/ {max}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-relaxed text-muted">{detail}</div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-eco/10 px-2.5 py-1 text-xs font-bold text-eco">
            <Icon name="star" className="h-3.5 w-3.5" />
            Optimum k = {bestK}
          </div>
        </div>
      </div>
    </div>
  )
}

function StabilityCard({ profiles }) {
  const avg = profiles.length
    ? Math.round(
        profiles.reduce((s, [_, m]) => s + (m.stability_at_5 || 0), 0) / profiles.length * 100
      )
    : 0
  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
      <div className="text-sm font-black uppercase tracking-wider text-muted">Fiabilité globale</div>
      <div className="mt-0.5 text-xs text-muted">Stabilité@5 moyenne (KNN)</div>
      <div className="mt-4 flex items-baseline gap-2">
        <div className="text-5xl font-black text-ink">{avg}</div>
        <div className="text-2xl font-bold text-muted">%</div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-card2">
        <div
          className="h-full rounded-full bg-eco transition-all duration-[1500ms]"
          style={{ width: `${avg}%` }}
        />
      </div>
      <div className="mt-4 text-xs leading-relaxed text-muted">
        Sur 5 profils voyageur testés, les 5 destinations recommandées restent
        <strong className="text-ink"> les mêmes {avg}% du temps</strong>.
      </div>
    </div>
  )
}

function Step({ n, icon, title, text, color }) {
  return (
    <div className="relative rounded-xl border border-line bg-card2 p-5">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ background: color + '15', color }}
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-xs font-black text-muted">{n}</span>
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{text}</p>
    </div>
  )
}

function ClusterBar({ rank, name, count, max, color }) {
  const pct = Math.min(100, (count / max) * 100)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-muted">#{rank}</span>
          <span className="font-semibold text-ink">{name}</span>
        </div>
        <span className="text-xs font-semibold text-muted">{fmt(count)} lieux</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-card2">
        <div
          className="h-full rounded-full transition-all duration-[1200ms]"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function ProfilCard({ profil, stability }) {
  const color = stability >= 90 ? '#0A5C36' : stability >= 75 ? '#F59E0B' : '#E76F51'
  return (
    <div className="rounded-xl border border-line bg-card2 p-4 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-muted">{profil}</div>
      <div className="mt-2 text-2xl font-black" style={{ color }}>
        {stability}%
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div
          className="h-full transition-all duration-[1200ms]"
          style={{ width: `${stability}%`, background: color }}
        />
      </div>
    </div>
  )
}

function Skel() {
  return (
    <div className="mx-auto max-w-page animate-pulse px-6 py-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-52 rounded-2xl bg-card2" />
        <div className="h-52 rounded-2xl bg-card2" />
      </div>
      <div className="mt-8 h-64 rounded-2xl bg-card2" />
      <div className="mt-8 h-72 rounded-2xl bg-card2" />
    </div>
  )
}

function Err() {
  return (
    <div className="mx-auto max-w-page px-6 py-24 text-center">
      <Icon name="x" className="mx-auto h-10 w-10 text-muted" />
      <div className="mt-4 text-lg font-semibold text-ink">Métriques indisponibles</div>
    </div>
  )
}
