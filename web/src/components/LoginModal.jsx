import { useState } from 'react'
import Logo from './Logo'
import { useAuth } from '../lib/auth.jsx'

// Panneau de connexion latéral, branché sur l'API (userapp.users).
export default function LoginModal({ open, onClose }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // login | signup
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const fd = new FormData(e.currentTarget)
    try {
      if (mode === 'login') {
        await login(fd.get('email'), fd.get('password'))
      } else {
        await register({
          email: fd.get('email'),
          pseudo: fd.get('pseudo'),
          password: fd.get('password'),
        })
      }
      onClose()
    } catch (e2) {
      setErr(e2.message || 'Une erreur est survenue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] transition-all duration-300 ${
        open ? 'visible' : 'invisible'
      }`}
    >
      {/* Arrière-plan sombre et flouté */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panneau latéral (Drawer) */}
      <div
        className={`fixed inset-y-0 right-0 z-[101] flex h-full w-full max-w-sm flex-col justify-between bg-card p-7 shadow-2xl transition-transform duration-300 ease-in-out transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div>
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <Logo textClass="text-xl" />
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-muted transition hover:bg-card2 hover:text-ink"
              aria-label="Fermer"
            >
              {'×'}
            </button>
          </div>

          {/* Titre */}
          <h2 className="mt-8 text-2xl font-black tracking-tight text-ink">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Retrouvez vos itinéraires et vos destinations favorites.
          </p>

          {/* Formulaire */}
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  name="pseudo"
                  placeholder="nom d'utilisateur"
                  required
                  className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-line bg-card2 px-4 text-sm outline-none transition focus:border-violet focus:bg-card"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Adresse e-mail
              </label>
              <input
                type="email"
                name="email"
                placeholder="nom@exemple.com"
                required
                className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-line bg-card2 px-4 text-sm outline-none transition focus:border-violet focus:bg-card"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted">
                  Mot de passe
                </label>
                {mode === 'login' && (
                  <button type="button" className="text-xs font-semibold text-violet hover:underline">
                    Oublié ?
                  </button>
                )}
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-line bg-card2 px-4 text-sm outline-none transition focus:border-violet focus:bg-card"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-2 h-11 w-full rounded-xl bg-violet text-sm font-semibold text-white shadow-lg shadow-violet/20 transition hover:bg-violet-dark hover:shadow-violet/30 disabled:opacity-60"
            >
              {busy ? '...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>

          {err && (
            <div className="mt-4 rounded-xl bg-red-50 p-3.5 text-center text-xs font-medium text-red-600">
              {err}
            </div>
          )}
        </div>

        {/* Pied du Drawer */}
        <div className="border-t border-line pt-5 text-center text-xs text-muted">
          {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setErr('')
            }}
            className="font-bold text-violet hover:underline"
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
