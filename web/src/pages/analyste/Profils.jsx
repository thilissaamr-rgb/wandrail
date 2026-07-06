import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Icon from '../../components/Icon'

const PROFILS = [
  { key: 'Solo', icon: 'user', color: '#2563EB', dominance: ['Culture', 'Patrimoine', 'Gastronomie'] },
  { key: 'Couple', icon: 'heart', color: '#DC2626', dominance: ['Gastronomie', 'Bien-être', 'Village'] },
  { key: 'Famille', icon: 'users', color: '#F59E0B', dominance: ['Loisirs', 'Nature', 'Activités enfants'] },
  { key: 'Entre amis', icon: 'star', color: '#15803D', dominance: ['Sortie', 'Festival', 'Sport'] },
  { key: 'Senior', icon: 'castle', color: '#0F7A4F', dominance: ['Patrimoine', 'Culture', 'Bien-être'] },
]

// Onglet Profils : quel profil trouve quelles destinations, sur quelles categories.
export default function Profils() {
  const [byProfile, setByProfile] = useState({})

  useEffect(() => {
    Promise.all(
      PROFILS.map((p) =>
        api.recommandations(p.key).then((r) => [p.key, r]).catch(() => [p.key, []])
      )
    ).then((entries) => {
      const map = {}
      entries.forEach(([k, v]) => { map[k] = v })
      setByProfile(map)
    })
  }, [])

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      <div>
        <h2 className="text-2xl font-black text-ink">Profils voyageurs</h2>
        <p className="mt-1 text-sm text-muted">
          Cinq profils éditoriaux. Chacun a ses top destinations et catégories dominantes.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROFILS.map((p) => {
          const recos = byProfile[p.key] || []
          return (
            <div key={p.key} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                  style={{ background: p.color }}
                >
                  <Icon name={p.icon} className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-base font-black text-ink">{p.key}</div>
                  <div className="text-xs text-muted">{recos.length} recommandations</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Catégories dominantes</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.dominance.map((c) => (
                    <span key={c} className="rounded-md bg-card2 px-2 py-1 text-[11px] font-bold text-ink">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Top 5 destinations</div>
                <ol className="mt-1.5 space-y-1 text-xs text-ink">
                  {recos.slice(0, 5).map((r, i) => (
                    <li key={r.nom_gare || i} className="flex items-center justify-between">
                      <span className="truncate">
                        <span className="mr-1 text-muted">{i + 1}.</span>
                        {r.commune || r.nom_gare}
                      </span>
                      <span className="ml-2 rounded bg-eco/10 px-1.5 py-0.5 text-[10px] font-bold text-eco">
                        {Number(r.score_reco || 0).toFixed(1)}
                      </span>
                    </li>
                  ))}
                  {recos.length === 0 && <li className="text-muted">Chargement…</li>}
                </ol>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 rounded-xl bg-eco/5 p-4 text-xs text-ink">
        <span className="font-bold text-eco">Insight · </span>
        Les profils Famille et Entre amis convergent vers des destinations riches en activités (loisirs, sport, festivals),
        tandis que Solo et Senior privilégient culture et patrimoine. Couple se distingue par gastronomie + bien-être.
      </div>
    </div>
  )
}
