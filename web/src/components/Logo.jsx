// Baseline affichee par defaut sous le nom (celle demandee par Thilissa).
export default function Logo({ textClass = 'text-2xl', showBaseline = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Icone W bleu marine + rail vert (SVG style 3D) */}
      <span className="flex h-11 w-12 flex-shrink-0 items-center justify-center">
        <svg viewBox="0 0 60 60" className="h-11 w-12" aria-hidden="true">
          <defs>
            <linearGradient id="wnavy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="wgreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#0f7a4f" />
            </linearGradient>
            <filter id="wshadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" />
              <feOffset dx="0.5" dy="1" result="off" />
              <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* W bleu marine gauche */}
          <path
            d="M8 12 L14 44 L22 22 L30 44 L30 12"
            stroke="url(#wnavy)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#wshadow)"
          />
          {/* Rail vert droit (E en forme de rail avec traverses) */}
          <path
            d="M36 12 L36 44 L52 44"
            stroke="url(#wgreen)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="url(#wshadow)"
          />
          {/* Traverses de rail */}
          {[16, 22, 28, 34, 40].map((y) => (
            <line key={y} x1="38" y1={y} x2="49" y2={y} stroke="url(#wgreen)" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          ))}
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display font-black uppercase tracking-tight text-navy dark:text-white ${textClass}`}>
          WANDRAIL
        </span>
        {showBaseline && (
          <span className="mt-1 text-[0.68rem] font-medium leading-tight text-eco">
            Votre prochaine aventure commence sur les rails.
          </span>
        )}
      </span>
    </span>
  )
}
