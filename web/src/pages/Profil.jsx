import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import Avatar from '../components/Avatar'
import BadgeIllustration from '../components/BadgeIllustration'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth.jsx'
import { formatPlaceName } from '../lib/format'
import { computeBadges, computeGrade } from '../lib/badges'

const TRAVELERS = ['Famille', 'Solo', 'Couple', 'Entre amis', 'Senior']
const WISHES = ['Nature', 'Gastronomie', 'Culture', 'Patrimoine', 'Bord de mer', 'Festivals']

function localPlans() {
  try {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith('wandrail:itin:'))
      .map((key) => ({
        destination: key.slice('wandrail:itin:'.length),
        stops: JSON.parse(localStorage.getItem(key) || '[]'),
      }))
      .filter((p) => p.stops.length)
  } catch {
    return []
  }
}

export default function Profil() {
  const { user, logout, updateAccount } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [form, setForm] = useState({
    pseudo: user?.pseudo || '',
    ville_depart: user?.ville_depart || '',
    voyageur: user?.preferences?.voyageur || '',
    envies: user?.preferences?.envies || [],
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) return
    api
      .profile()
      .then((profile) => {
        setData(profile)
        setForm({
          pseudo: profile.pseudo || '',
          ville_depart: profile.ville_depart || '',
          voyageur: profile.preferences?.voyageur || '',
          envies: profile.preferences?.envies || [],
        })
      })
      .catch(() => setData(null))
  }, [user])

  if (!user)
    return (
      <div className="mx-auto max-w-page px-6 py-24 text-center">
        <Icon name="user" className="mx-auto h-9 w-9 text-muted" />
        <h1 className="mt-4 text-2xl font-bold text-ink">Connectez-vous</h1>
        <button
          onClick={() => navigate('/')}
          className="mt-6 rounded-lg bg-eco px-5 py-2.5 text-sm font-semibold text-white"
        >
          Retour à l'accueil
        </button>
      </div>
    )

  // Stats reelles depuis l'API (ou zeros au debut)
  const stats = {
    nb_trajets: data?.nb_trajets || 0,
    co2_evite_kg: data?.co2_evite_kg || 0,
    villes_visitees: data?.villes_visitees || 0,
    nb_favoris: data?.nb_favoris || 0,
  }
  const badges = computeBadges(stats)
  const { current: grade, next: nextGrade, progressPct, remaining } = computeGrade(stats.co2_evite_kg)
  const unlockedCount = badges.filter((b) => b.unlocked).length
  const plans = localPlans()

  const save = async (event) => {
    event.preventDefault()
    setMessage('Enregistrement…')
    try {
      await updateAccount({
        pseudo: form.pseudo,
        ville_depart: form.ville_depart,
        preferences: { voyageur: form.voyageur, envies: form.envies },
      })
      setMessage('Préférences enregistrées')
    } catch {
      setMessage('Enregistrement impossible')
    }
  }

  const toggleWish = (wish) =>
    setForm((c) => ({
      ...c,
      envies: c.envies.includes(wish) ? c.envies.filter((w) => w !== wish) : [...c.envies, wish],
    }))

  return (
    <div className="mx-auto max-w-page px-6 py-8">
      {/* HERO Profil avec Grade + progression */}
      <section
        className="overflow-hidden rounded-3xl border border-line p-8 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${grade.color}12, var(--card))`,
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          {/* Avatar upload / silhouette par defaut */}
          <Avatar email={user.email} size={104} editable />


          {/* Nom + grade + progression */}
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-ink">{user.pseudo}</h1>
            <p className="text-sm text-muted">{user.email}</p>

            <div className="mt-4 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white"
                style={{ background: grade.color }}
              >
                <Icon name={grade.icon} className="h-4 w-4" />
                {grade.name}
              </span>
              {nextGrade && (
                <span className="text-xs text-muted">
                  Prochain : <strong className="text-ink">{nextGrade.name}</strong>
                </span>
              )}
            </div>

            {/* Barre de progression vers le grade suivant */}
            {nextGrade && (
              <div className="mt-3 max-w-md">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {Math.round(stats.co2_evite_kg)} kg CO₂ économisés
                  </span>
                  <span className="font-semibold text-ink">
                    {Math.round(remaining)} kg pour {nextGrade.name}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full transition-all duration-[1500ms]"
                    style={{ width: `${progressPct}%`, background: grade.color }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Déconnexion */}
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-red-600"
          >
            <Icon name="logout" className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </section>

      {/* Chiffres cles perso */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBox icon="train" color="#0A5C36" value={stats.nb_trajets} label="Trajets" />
        <StatBox
          icon="leaf"
          color="#22C55E"
          value={Math.round(stats.co2_evite_kg)}
          unit="kg"
          label="CO₂ évité"
        />
        <StatBox icon="pin" color="#E76F51" value={stats.villes_visitees} label="Villes visitées" />
        <StatBox icon="heart" color="#EF4444" value={stats.nb_favoris} label="Favoris" />
      </div>

      {/* Badges : gagnés + à débloquer */}
      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">Mes badges</h2>
            <p className="mt-1 text-xs text-muted">
              {unlockedCount} sur {badges.length} débloqués — chaque trajet vous rapproche du suivant
            </p>
          </div>
          <span className="rounded-full bg-eco/10 px-3 py-1 text-xs font-bold text-eco">
            {unlockedCount}/{badges.length}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </section>

      {/* Voyages préparés + Préférences */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-black text-ink">Voyages préparés</h2>
            <Link to="/favoris" className="text-sm font-semibold text-eco hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {plans.length ? (
              plans.slice(0, 3).map((plan) => (
                <Link
                  key={plan.destination}
                  to={`/destinations/${encodeURIComponent(plan.destination)}`}
                  className="flex items-center gap-3 rounded-xl border border-line p-4 transition hover:border-eco"
                >
                  <Icon name="map" className="h-5 w-5 text-eco" />
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {formatPlaceName(plan.destination)}
                    </div>
                    <div className="text-xs text-muted">
                      {plan.stops.length} étape{plan.stops.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-line p-7 text-center text-sm text-muted">
                Aucun voyage préparé.{' '}
                <Link to="/destinations" className="font-semibold text-eco">
                  Explorer
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="text-lg font-black text-ink">Mes préférences</h2>
          <p className="mt-1 text-xs text-muted">Pour recevoir des recommandations sur mesure</p>
          <form onSubmit={save} className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-muted">
                Nom affiché
                <input
                  value={form.pseudo}
                  onChange={(e) => setForm({ ...form, pseudo: e.target.value })}
                  required
                  minLength={2}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-card2 px-3 text-sm text-ink outline-none focus:border-eco"
                />
              </label>
              <label className="text-xs font-semibold text-muted">
                Ville de départ
                <input
                  value={form.ville_depart}
                  onChange={(e) => setForm({ ...form, ville_depart: e.target.value })}
                  placeholder="Ex. Nantes"
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-card2 px-3 text-sm text-ink outline-none focus:border-eco"
                />
              </label>
            </div>
            <label className="block text-xs font-semibold text-muted">
              Type de voyage
              <select
                value={form.voyageur}
                onChange={(e) => setForm({ ...form, voyageur: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-card2 px-3 text-sm text-ink outline-none focus:border-eco"
              >
                <option value="">Sans préférence</option>
                {TRAVELERS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <div>
              <div className="text-xs font-semibold text-muted">Mes envies</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {WISHES.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggleWish(w)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      form.envies.includes(w)
                        ? 'border-eco bg-eco text-white'
                        : 'border-line text-muted hover:border-eco'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-xs text-muted">{message}</span>
              <button className="rounded-lg bg-eco px-5 py-2 text-sm font-semibold text-white hover:bg-eco-dark">
                Enregistrer
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function StatBox({ icon, color, value, unit, label }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: color + '18', color }}
      >
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className="text-xl font-black text-ink">{value}</div>
        {unit && <div className="text-xs font-semibold text-muted">{unit}</div>}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}

function BadgeCard({ badge }) {
  const unlocked = badge.unlocked
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 text-center transition-all duration-300 ${
        unlocked
          ? 'border-line bg-card shadow-sm hover:-translate-y-1 hover:shadow-lg'
          : 'border-dashed border-line bg-card2/40'
      }`}
    >
      {unlocked && (
        <div
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-70"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${badge.color}22 0%, transparent 60%)`,
          }}
        />
      )}
      <div className="relative mx-auto flex justify-center">
        <BadgeIllustration id={badge.id} unlocked={unlocked} className="h-20 w-20" />
        {!unlocked && (
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-white shadow-md ring-2 ring-card">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          </span>
        )}
      </div>
      <div className={`relative mt-3 text-sm font-black tracking-tight ${unlocked ? 'text-ink' : 'text-muted'}`}>
        {badge.name}
      </div>
      <div className="relative mt-1 text-[10px] leading-relaxed text-muted">{badge.desc}</div>
      {unlocked && (
        <div className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
          Débloqué
        </div>
      )}
    </div>
  )
}
