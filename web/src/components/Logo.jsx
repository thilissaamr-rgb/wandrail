// Logo Wandrail v2 : icone train arrondie + mot-symbole
// (palette eco : navy + vert eco - inspiree tourisme durable SNCF).
export default function Logo({ textClass = 'text-2xl', showBaseline = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* Icone : train stylise dans un badge arrondi navy */}
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-navy shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-eco-light" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="13" rx="3" />
          <path d="M8 8h8M4 11h16M8.5 20l-1.5 2M15.5 20l1.5 2" />
          <circle cx="9" cy="14" r="0.9" fill="currentColor" />
          <circle cx="15" cy="14" r="0.9" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`font-display font-black uppercase tracking-tight text-navy dark:text-white ${textClass}`}>
          WANDRAIL
        </span>
        {showBaseline && (
          <span className="mt-1 text-[0.68rem] font-medium leading-tight text-eco">
            Le tourisme en train, autrement.
          </span>
        )}
      </span>
    </span>
  )
}
