// Baseline affichee par defaut sous le nom (celle demandee par Thilissa).
export default function Logo({ textClass = 'text-2xl', showBaseline = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative h-11 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <img src="/brand/wandrail-logo.png" alt="" aria-hidden="true" className="absolute -left-[31px] -top-[4px] w-[110px] max-w-none" />
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
