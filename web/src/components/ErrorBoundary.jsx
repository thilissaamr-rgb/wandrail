import { Component } from 'react'

// ErrorBoundary React : capture les crash de rendu et affiche un fallback
// propre au lieu d une page blanche. Indispensable en prod / soutenance.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="mx-auto max-w-page px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-2xl">
          ⚠️
        </div>
        <h1 className="mt-6 text-2xl font-black text-ink">Une erreur est survenue</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Un composant n'a pas pu s'afficher. L'application continue de fonctionner —
          essayez de recharger la page ou de revenir à l'accueil.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg bg-eco px-5 py-2.5 text-sm font-bold text-white transition hover:bg-eco-dark"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-muted transition hover:border-eco hover:text-eco"
          >
            Retour à l'accueil
          </a>
        </div>
        {this.state.error && (
          <details className="mx-auto mt-8 max-w-lg rounded-xl border border-line bg-card2/50 p-4 text-left">
            <summary className="cursor-pointer text-xs font-semibold text-muted">Détails techniques</summary>
            <pre className="mt-2 overflow-auto text-[10px] text-muted">{String(this.state.error?.message || this.state.error)}</pre>
          </details>
        )}
      </div>
    )
  }
}
