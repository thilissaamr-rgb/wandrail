// Illustrations riches pour chaque badge Wandrail.
// SVG detailles, coherents avec la palette train + nature.
// Style : dégradés, formes rondes, jamais infantile — encouragement pour
// l usage du train.

const ILLUSTRATIONS = {
  first_trip: FirstTrip,
  ten_trips: TenTrips,
  fifty_trips: FiftyTrips,
  first_co2: FirstCO2,
  hundred_co2: HundredCO2,
  thousand_co2: ThousandCO2,
  five_villes: FiveVilles,
  twenty_villes: TwentyVilles,
  five_favs: FiveFavs,
  twenty_favs: TwentyFavs,
}

export default function BadgeIllustration({ id, unlocked, className = 'h-16 w-16' }) {
  const Comp = ILLUSTRATIONS[id]
  if (!Comp) return null
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: unlocked ? 'none' : 'grayscale(1) opacity(0.35)' }}
    >
      <Comp />
    </svg>
  )
}

// ── Trajets ─────────────────────────────────────────────

function FirstTrip() {
  return (
    <>
      <defs>
        <linearGradient id="ft-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DCFCE7" />
          <stop offset="100%" stopColor="#86EFAC" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#ft-bg)" stroke="#0A5C36" strokeWidth="1.5" />
      {/* Rail */}
      <path d="M12 60 L68 60" stroke="#0A5C36" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
      <path d="M18 63 L22 63 M28 63 L32 63 M38 63 L42 63 M48 63 L52 63 M58 63 L62 63" stroke="#0A5C36" strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
      {/* Train */}
      <rect x="24" y="34" width="32" height="22" rx="6" fill="#0A5C36" />
      <rect x="28" y="38" width="10" height="8" rx="2" fill="#DCFCE7" />
      <rect x="42" y="38" width="10" height="8" rx="2" fill="#DCFCE7" />
      <circle cx="30" cy="58" r="3" fill="#1C1C1C" />
      <circle cx="50" cy="58" r="3" fill="#1C1C1C" />
      {/* Etoile "premier" */}
      <path d="M56 22 L58 27 L63 27 L59 30 L61 35 L56 32 L51 35 L53 30 L49 27 L54 27 Z" fill="#F59E0B" />
    </>
  )
}

function TenTrips() {
  return (
    <>
      <defs>
        <linearGradient id="tt-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DBEAFE" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#tt-bg)" stroke="#1F6FEB" strokeWidth="1.5" />
      {/* Montagnes en fond */}
      <path d="M8 55 L22 32 L32 42 L44 24 L58 40 L72 55 Z" fill="#1F6FEB" opacity="0.25" />
      <path d="M8 55 L18 40 L28 48 L38 32 L50 45 L72 55 Z" fill="#1F6FEB" opacity="0.35" />
      {/* Rail */}
      <path d="M8 60 L72 60" stroke="#1E40AF" strokeWidth="2" strokeLinecap="round" />
      {/* Train */}
      <rect x="20" y="42" width="40" height="18" rx="5" fill="#1E40AF" />
      <path d="M20 42 Q16 42 16 46 L16 60 L20 60 Z" fill="#1E40AF" />
      <rect x="24" y="46" width="7" height="7" rx="1.5" fill="#DBEAFE" />
      <rect x="34" y="46" width="7" height="7" rx="1.5" fill="#DBEAFE" />
      <rect x="44" y="46" width="7" height="7" rx="1.5" fill="#DBEAFE" />
      <text x="40" y="22" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1E40AF">10</text>
    </>
  )
}

function FiftyTrips() {
  return (
    <>
      <defs>
        <linearGradient id="fft-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
        <linearGradient id="fft-train" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#fft-bg)" stroke="#B45309" strokeWidth="1.5" />
      {/* Speed lines derriere */}
      <path d="M6 32 L18 32 M4 40 L20 40 M6 48 L18 48" stroke="#B45309" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      {/* TGV effile */}
      <path d="M18 34 Q14 40 18 46 L58 46 Q66 46 66 40 Q66 34 58 34 Z" fill="url(#fft-train)" />
      <path d="M56 36 L62 36 L60 40 L62 44 L56 44 Z" fill="#FEF3C7" />
      <rect x="26" y="37" width="6" height="6" rx="1" fill="#FEF3C7" />
      <rect x="36" y="37" width="6" height="6" rx="1" fill="#FEF3C7" />
      <rect x="46" y="37" width="6" height="6" rx="1" fill="#FEF3C7" />
      {/* Trophee */}
      <text x="40" y="22" textAnchor="middle" fontSize="12" fontWeight="900" fill="#B45309">50 ⚡</text>
    </>
  )
}

// ── CO2 evite ───────────────────────────────────────────

function FirstCO2() {
  return (
    <>
      <defs>
        <linearGradient id="fc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0FDF4" />
          <stop offset="100%" stopColor="#BBF7D0" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#fc-bg)" stroke="#16A34A" strokeWidth="1.5" />
      {/* Terre */}
      <ellipse cx="40" cy="62" rx="18" ry="3" fill="#78350F" opacity="0.7" />
      {/* Tige */}
      <path d="M40 62 L40 42" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />
      {/* Feuilles */}
      <path d="M40 50 C32 48 30 42 34 38 C38 40 40 46 40 50 Z" fill="#22C55E" />
      <path d="M40 46 C48 44 50 38 46 34 C42 36 40 42 40 46 Z" fill="#4ADE80" />
      {/* Point brillant */}
      <circle cx="46" cy="34" r="2" fill="#FEF3C7" opacity="0.8" />
    </>
  )
}

function HundredCO2() {
  return (
    <>
      <defs>
        <linearGradient id="hc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D1FAE5" />
          <stop offset="100%" stopColor="#6EE7B7" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#hc-bg)" stroke="#065F46" strokeWidth="1.5" />
      {/* Terre */}
      <ellipse cx="40" cy="66" rx="24" ry="3" fill="#78350F" opacity="0.6" />
      {/* Tronc */}
      <path d="M40 66 L40 44" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
      {/* Feuillage boules */}
      <circle cx="40" cy="34" r="14" fill="#166534" />
      <circle cx="32" cy="38" r="10" fill="#16A34A" />
      <circle cx="48" cy="38" r="10" fill="#22C55E" />
      <circle cx="40" cy="28" r="8" fill="#4ADE80" />
      {/* Petits fruits */}
      <circle cx="34" cy="32" r="1.5" fill="#EF4444" />
      <circle cx="46" cy="34" r="1.5" fill="#EF4444" />
      <circle cx="40" cy="24" r="1.5" fill="#EF4444" />
    </>
  )
}

function ThousandCO2() {
  return (
    <>
      <defs>
        <linearGradient id="tc-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFDBFE" />
          <stop offset="100%" stopColor="#86EFAC" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#tc-bg)" stroke="#064E3B" strokeWidth="1.5" />
      {/* Globe */}
      <circle cx="40" cy="40" r="22" fill="#3B82F6" />
      <path d="M18 40 A 22 22 0 0 1 62 40" fill="none" stroke="#1E40AF" strokeWidth="1" opacity="0.5" />
      <path d="M40 18 A 22 22 0 0 1 40 62" fill="none" stroke="#1E40AF" strokeWidth="1" opacity="0.5" />
      {/* Continents */}
      <path d="M28 32 C26 30 28 26 32 26 C36 28 38 30 36 34 C34 36 30 34 28 32 Z" fill="#16A34A" />
      <path d="M44 38 C42 40 44 46 48 44 C52 42 54 38 50 36 C46 36 46 36 44 38 Z" fill="#22C55E" />
      <path d="M34 44 C32 46 34 52 38 50 C42 48 42 44 38 42 C36 42 36 42 34 44 Z" fill="#16A34A" />
      {/* Etoile champion */}
      <path d="M62 20 L64 25 L69 25 L65 28 L67 33 L62 30 L57 33 L59 28 L55 25 L60 25 Z" fill="#FBBF24" stroke="#B45309" strokeWidth="0.5" />
    </>
  )
}

// ── Villes ──────────────────────────────────────────────

function FiveVilles() {
  return (
    <>
      <defs>
        <linearGradient id="fv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#fv-bg)" stroke="#C2410C" strokeWidth="1.5" />
      {/* Map lines */}
      <path d="M12 40 Q24 30 40 40 T 68 40" stroke="#C2410C" strokeWidth="1" opacity="0.4" fill="none" strokeDasharray="2 3" />
      <path d="M18 24 L28 32 L38 28 L46 36 L58 30" stroke="#C2410C" strokeWidth="1" opacity="0.4" fill="none" strokeDasharray="2 3" />
      {/* 3 pins */}
      <path d="M24 46 C24 41 28 38 32 41 C34 43 34 46 32 48 C30 50 24 50 24 46 Z" fill="#DC2626" />
      <circle cx="29" cy="44" r="2" fill="#FED7AA" />
      <path d="M40 32 C40 27 44 24 48 27 C50 29 50 32 48 34 C46 36 40 36 40 32 Z" fill="#DC2626" />
      <circle cx="45" cy="30" r="2" fill="#FED7AA" />
      <path d="M52 50 C52 45 56 42 60 45 C62 47 62 50 60 52 C58 54 52 54 52 50 Z" fill="#DC2626" />
      <circle cx="57" cy="48" r="2" fill="#FED7AA" />
    </>
  )
}

function TwentyVilles() {
  return (
    <>
      <defs>
        <linearGradient id="tv-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#tv-bg)" stroke="#7F1D1D" strokeWidth="1.5" />
      {/* Hexagone France stylisée */}
      <path d="M40 16 L58 26 L58 50 L40 62 L22 50 L22 26 Z" fill="#FEF2F2" opacity="0.7" stroke="#7F1D1D" strokeWidth="1" />
      {/* Multiples pins */}
      {[
        [30, 30], [50, 28], [42, 40], [28, 46], [52, 48], [40, 52],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3" fill="#7F1D1D" />
          <circle cx={x} cy={y} r="1.5" fill="#FEF2F2" />
        </g>
      ))}
    </>
  )
}

// ── Favoris ─────────────────────────────────────────────

function FiveFavs() {
  return (
    <>
      <defs>
        <linearGradient id="ff-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCE7F3" />
          <stop offset="100%" stopColor="#F9A8D4" />
        </linearGradient>
        <linearGradient id="ff-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#ff-bg)" stroke="#BE123C" strokeWidth="1.5" />
      {/* Coeur central */}
      <path d="M40 60 C 20 46 20 30 30 26 C 36 24 40 30 40 34 C 40 30 44 24 50 26 C 60 30 60 46 40 60 Z" fill="url(#ff-heart)" />
      {/* Etincelles */}
      <path d="M20 22 L22 26 L26 24 L22 22 Z" fill="#FBBF24" />
      <path d="M60 20 L62 24 L66 22 L62 20 Z" fill="#FBBF24" />
      <circle cx="16" cy="42" r="1.5" fill="#FBBF24" />
      <circle cx="64" cy="46" r="1.5" fill="#FBBF24" />
    </>
  )
}

function TwentyFavs() {
  return (
    <>
      <defs>
        <linearGradient id="tf-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5D0FE" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>
        <linearGradient id="tf-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#831843" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="36" fill="url(#tf-bg)" stroke="#701A75" strokeWidth="1.5" />
      {/* Couronne */}
      <path d="M22 30 L28 22 L34 30 L40 20 L46 30 L52 22 L58 30 L58 34 L22 34 Z" fill="#FBBF24" stroke="#B45309" strokeWidth="1" />
      <circle cx="28" cy="24" r="1.5" fill="#EF4444" />
      <circle cx="40" cy="22" r="1.5" fill="#3B82F6" />
      <circle cx="52" cy="24" r="1.5" fill="#22C55E" />
      {/* Coeur */}
      <path d="M40 62 C 22 50 22 38 30 36 C 36 34 40 38 40 42 C 40 38 44 34 50 36 C 58 38 58 50 40 62 Z" fill="url(#tf-heart)" />
    </>
  )
}
