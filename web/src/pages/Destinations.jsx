import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import DestinationCard from '../components/DestinationCard'
import { SkeletonGrid } from '../components/CardSkeleton'

const VOYAGEURS = ['Famille', 'Solo', 'Couple', 'Entre amis', 'Senior']
const CATEGORIES = ['Nature', 'Restauration', 'Culture', 'Patrimoine', 'Hebergement', 'Loisirs', 'Evenement']

export default function Destinations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [deps, setDeps] = useState([])
  const [profils, setProfils] = useState([])
  const [dests, setDests] = useState([])
  const [loading, setLoading] = useState(true)

  const q = searchParams.get('q') || ''
  const departement = searchParams.get('departement') || ''
  const profil = searchParams.get('profil') || ''
  const categorie = searchParams.get('categorie') || ''
  const voyageur = searchParams.get('voyageur') || ''
  const sort = searchParams.get('sort') || 'score'

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  useEffect(() => {
    api.departements().then(setDeps).catch(() => {})
    api.profils().then(setProfils).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const source = voyageur
      ? api.recommandations(voyageur)
      : api.destinations({ q, departement, profil, categorie, sort, limit: 30 })

    source
      .then((rows) => {
        if (!voyageur) return setDests(rows)
        let out = rows
        if (q) {
          const term = q.toLowerCase()
          out = out.filter(
            (item) =>
              (item.commune || '').toLowerCase().includes(term) ||
              (item.nom_gare || '').toLowerCase().includes(term),
          )
        }
        if (departement) out = out.filter((item) => item.departement === departement)
        const comparator = {
          score: (a, b) =>
            a.rang && b.rang
              ? a.rang - b.rang
              : (b.score_attractivite || 0) - (a.score_attractivite || 0),
          nom: (a, b) => (a.commune || '').localeCompare(b.commune || ''),
          poi: (a, b) => (b.nb_poi_5km || 0) - (a.nb_poi_5km || 0),
        }[sort]
        setDests([...out].sort(comparator))
      })
      .catch(() => setDests([]))
      .finally(() => setLoading(false))
  }, [q, departement, profil, categorie, voyageur, sort])

  const fieldClass =
    'h-11 w-full rounded-xl border border-line bg-card2 px-4 text-sm text-ink outline-none focus:border-eco'

  return (
    <div className="mx-auto max-w-page px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-ink">Destinations</h1>
        <p className="mt-1 text-sm text-muted">Recherche et filtres sur le catalogue de destinations.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-card p-5">
          <div className="space-y-4">
            <Field label="Recherche">
              <input
                value={q}
                onChange={(e) => setParam('q', e.target.value)}
                placeholder="Ville ou gare"
                className={fieldClass}
              />
            </Field>

            <Field label="Département">
              <select value={departement} onChange={(e) => setParam('departement', e.target.value)} className={fieldClass}>
                <option value="">Tous</option>
                {deps.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Voyageur">
              <select value={voyageur} onChange={(e) => setParam('voyageur', e.target.value)} className={fieldClass}>
                <option value="">Tous</option>
                {VOYAGEURS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Catégorie">
              <select value={categorie} onChange={(e) => setParam('categorie', e.target.value)} className={fieldClass}>
                <option value="">Toutes</option>
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Profil">
              <select value={profil} onChange={(e) => setParam('profil', e.target.value)} className={fieldClass}>
                <option value="">Tous</option>
                {profils.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tri">
              <select value={sort} onChange={(e) => setParam('sort', e.target.value)} className={fieldClass}>
                <option value="score">Score</option>
                <option value="nom">Nom</option>
                <option value="poi">Activités</option>
              </select>
            </Field>
          </div>
        </aside>

        <div>
          <div className="mb-5 text-sm text-muted">
            {loading ? 'Chargement...' : `${dests.length} résultat${dests.length > 1 ? 's' : ''}`}
          </div>

          {loading ? (
            <SkeletonGrid count={6} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {dests.map((item) => (
                <DestinationCard key={item.nom_gare} dest={item} />
              ))}
            </div>
          )}

          {!loading && dests.length === 0 && (
            <div className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
              Aucun résultat.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
