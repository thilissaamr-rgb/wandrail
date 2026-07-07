export default function Logo({ textClass = 'text-2xl', showBaseline = true }) {
  return (
    <span className="inline-flex items-start gap-0">
      <span className="flex flex-col leading-none">
        <span className="flex items-center">
          <span className={`font-display font-black tracking-tight ${textClass}`}>
            <span style={{ color: '#15803d' }}>Wand</span>
            <span style={{
              background: 'linear-gradient(90deg, #16a34a, #84cc16)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>rail</span>
          </span>
          {/* Arrow chevron */}
          <svg viewBox="0 0 32 32" className="ml-0.5" style={{ width: '0.8em', height: '0.8em' }} aria-hidden="true">
            <defs>
              <linearGradient id="arrowGrad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#16a34a" />
                <stop offset="100%" stopColor="#a3e635" />
              </linearGradient>
            </defs>
            <path d="M6 22 L16 6 L26 16" stroke="url(#arrowGrad)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
        {showBaseline && (
          <span className="mt-1 text-[0.62rem] font-medium leading-tight text-muted italic">
            Votre prochain coup de c&oelig;ur, à portée de train.
          </span>
        )}
      </span>
    </span>
  )
}
