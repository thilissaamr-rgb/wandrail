import Icon from './Icon'

// Container standardise pour les graphes Recharts.
// - Titre + sous-titre + optionnel badge / kpi
// - Hauteur fixee (par defaut) pour eviter les sauts de layout au chargement
// - Bordure et fond via tokens (light + dark automatiques)
export default function ChartCard({
  title,
  subtitle,
  badge,
  height = 300,
  className = '',
  children,
  icon,
}) {
  return (
    <div className={`rounded-2xl border border-line bg-card p-5 shadow-sm transition duration-300 hover:shadow-md ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-eco/10 text-eco">
                <Icon name={icon} className="h-3.5 w-3.5" />
              </span>
            )}
            <h3 className="text-sm font-black uppercase tracking-wider text-ink">{title}</h3>
          </div>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {badge && (
          <span className="flex-shrink-0 rounded-full bg-eco/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-eco">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-4" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
