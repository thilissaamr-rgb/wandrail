import Icon from './Icon'

// 4 cards "Mobilite locale" cliquables. Compte les stations reelles depuis
// silver.mobilites via /api/destinations/{nom}/mobilites.
export function MobiliteCards({ mobilites, activeTab, onSelectTab }) {
  const totaux = mobilites?.totaux || {}
  const cards = [
    {
      id: 'centre',
      icon: 'pin',
      label: 'Centre-ville',
      value: '≤ 5 min à pied',
      chip: 'Accessible',
      color: '#EAB308',
      disabled: true,
    },
    {
      id: 'velo',
      icon: 'activity',
      label: 'Vélos en libre-service',
      value: mobilites ? `${totaux.velo || 0} station${(totaux.velo || 0) > 1 ? 's' : ''}` : '…',
      chip: totaux.velo ? 'Voir la liste' : 'Aucune trouvée',
      color: '#EF4444',
      disabled: !totaux.velo,
    },
    {
      id: 'bus',
      icon: 'bus',
      label: 'Bus urbains',
      value: mobilites ? `${totaux.bus || 0} arrêt${(totaux.bus || 0) > 1 ? 's' : ''}` : '…',
      chip: totaux.bus ? 'Voir la liste' : 'Aucun arrêt',
      color: '#1F6FEB',
      disabled: !totaux.bus,
    },
    {
      id: 'tram',
      icon: 'tram',
      label: 'Tramway',
      value: mobilites ? `${totaux.tram || 0} arrêt${(totaux.tram || 0) > 1 ? 's' : ''}` : '…',
      chip: totaux.tram ? 'Voir la liste' : 'Non desservi',
      color: '#8B5CF6',
      disabled: !totaux.tram,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => {
        const active = activeTab === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => !c.disabled && onSelectTab(active ? null : c.id)}
            disabled={c.disabled}
            className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
              c.disabled
                ? 'cursor-default border-line bg-card2/40 opacity-60'
                : active
                  ? 'border-eco bg-card shadow-lg ring-2 ring-eco/20'
                  : 'border-line bg-card hover:-translate-y-0.5 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ background: c.color }}
              >
                <Icon name={c.icon} className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                {c.label}
              </span>
            </div>
            <div className="mt-3 text-base font-black text-ink">{c.value}</div>
            <div
              className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                c.disabled ? 'bg-card2 text-muted' : 'bg-eco/10 text-eco'
              }`}
            >
              {c.chip}
            </div>
            {!c.disabled && (
              <span className="absolute right-3 top-3 text-muted">
                <Icon name={active ? 'x' : 'chevronRight'} className="h-4 w-4" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Liste depliable des stations : nom, distance, bouton itineraire.
export function MobiliteList({ type, stations, onGoTo, onClose }) {
  if (!stations.length) return null
  const title =
    type === 'velo' ? 'Stations vélo libre-service'
    : type === 'bus' ? 'Arrêts de bus urbains'
    : type === 'tram' ? 'Arrêts de tramway'
    : 'Ferries'
  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl border border-line bg-card shadow-md"
      style={{ animation: 'mobDrop .35s ease-out both' }}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {stations.length} station{stations.length > 1 ? 's' : ''} dans un rayon de 2 km
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-card2 hover:text-ink"
          aria-label="Fermer"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <ul className="max-h-96 divide-y divide-line overflow-y-auto">
        {stations.slice(0, 30).map((s, i) => (
          <li
            key={`${s.nom_station}-${i}`}
            className="flex items-center gap-3 px-5 py-3 transition hover:bg-card2/60"
            style={{ animation: `mobFade .3s ease-out ${i * 20}ms both` }}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white"
              style={{
                background: type === 'velo' ? '#EF4444' : type === 'bus' ? '#1F6FEB' : '#8B5CF6',
              }}
            >
              <Icon name={type === 'velo' ? 'activity' : type === 'tram' ? 'tram' : type === 'ferry' ? 'ferry' : 'bus'} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-ink">
                {s.nom_station || 'Station'}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{Number(s.distance_km).toFixed(1)} km · ~{Math.max(1, Math.round(s.distance_km * 12))} min à pied</span>
                {s.nb_places > 0 && (
                  <span className="rounded bg-card2 px-1.5 py-0.5 text-[10px] font-bold">
                    {s.nb_places} places
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onGoTo(s)}
              className="flex-shrink-0 rounded-lg bg-eco px-3 py-1.5 text-xs font-bold text-white transition hover:bg-eco-dark"
            >
              Itinéraire →
            </button>
          </li>
        ))}
      </ul>
      <style>{`
        @keyframes mobDrop { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes mobFade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}

export default MobiliteCards
