// Icones meteo SVG animees (Lucide-inspired). Aucune emoji.
// Chaque icone anime un detail : rayons soleil qui tournent, gouttes qui tombent,
// nuage qui flotte, eclair qui pulse.

export default function WeatherIcon({ type = 'cloud', className = 'h-10 w-10' }) {
  const icons = {
    sun: <Sun />,
    partly: <Partly />,
    cloud: <Cloud />,
    fog: <Fog />,
    drizzle: <Drizzle />,
    rain: <Rain />,
    snow: <Snow />,
    storm: <Storm />,
  }
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      {icons[type] || icons.cloud}
    </svg>
  )
}

function Sun() {
  return (
    <g>
      <g style={{ transformOrigin: '32px 32px', animation: 'wxspin 12s linear infinite' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <line
            key={a}
            x1="32"
            y1="8"
            x2="32"
            y2="14"
            stroke="#F59E0B"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${a} 32 32)`}
          />
        ))}
      </g>
      <circle cx="32" cy="32" r="10" fill="#FBBF24" />
      <style>{`@keyframes wxspin{to{transform:rotate(360deg)}}`}</style>
    </g>
  )
}

function Partly() {
  return (
    <g>
      <g transform="translate(18 12)">
        <g style={{ transformOrigin: '10px 10px', animation: 'wxspin 14s linear infinite' }}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line key={a} x1="10" y1="0" x2="10" y2="3" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 10 10)`} />
          ))}
        </g>
        <circle cx="10" cy="10" r="6" fill="#FBBF24" />
      </g>
      <CloudShape fill="#E2E8F0" x="6" y="26" />
      <style>{`@keyframes wxspin{to{transform:rotate(360deg)}}`}</style>
    </g>
  )
}

function Cloud() {
  return (
    <g style={{ animation: 'wxfloat 4s ease-in-out infinite' }}>
      <CloudShape fill="#94A3B8" x="6" y="18" />
      <style>{`@keyframes wxfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}`}</style>
    </g>
  )
}

function Fog() {
  return (
    <g>
      <CloudShape fill="#CBD5E1" x="6" y="14" />
      <line x1="10" y1="46" x2="54" y2="46" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="52" x2="50" y2="52" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </g>
  )
}

function Drizzle() {
  return (
    <g>
      <CloudShape fill="#64748B" x="6" y="12" />
      {[20, 32, 44].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1="42"
          x2={x - 2}
          y2="52"
          stroke="#3B82F6"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ animation: `wxdrop 1.4s ease-in ${i * 0.2}s infinite`, transformOrigin: `${x}px 42px` }}
        />
      ))}
      <style>{`@keyframes wxdrop{0%{opacity:0;transform:translateY(-4px)}30%{opacity:1}100%{opacity:0;transform:translateY(6px)}}`}</style>
    </g>
  )
}

function Rain() {
  return (
    <g>
      <CloudShape fill="#475569" x="6" y="10" />
      {[18, 26, 34, 42, 50].map((x, i) => (
        <line
          key={x}
          x1={x}
          y1="42"
          x2={x - 3}
          y2="56"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ animation: `wxrain 1s linear ${i * 0.15}s infinite` }}
        />
      ))}
      <style>{`@keyframes wxrain{0%{opacity:0;transform:translate(0,-6px)}40%{opacity:1}100%{opacity:0;transform:translate(-3px,8px)}}`}</style>
    </g>
  )
}

function Snow() {
  return (
    <g>
      <CloudShape fill="#94A3B8" x="6" y="10" />
      {[20, 32, 44].map((x, i) => (
        <text
          key={x}
          x={x}
          y="52"
          textAnchor="middle"
          fontSize="12"
          fill="#60A5FA"
          style={{ animation: `wxsnow 2s ease-in ${i * 0.3}s infinite` }}
        >
          ❄
        </text>
      ))}
      <style>{`@keyframes wxsnow{0%,100%{opacity:.4;transform:translateY(0)}50%{opacity:1;transform:translateY(3px)}}`}</style>
    </g>
  )
}

function Storm() {
  return (
    <g>
      <CloudShape fill="#334155" x="6" y="10" />
      <polygon
        points="30,42 24,54 30,54 26,60 40,46 34,46 38,38"
        fill="#F59E0B"
        style={{ animation: 'wxflash 1.8s ease-in-out infinite' }}
      />
      <style>{`@keyframes wxflash{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </g>
  )
}

function CloudShape({ fill, x = 0, y = 0 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M12 26 C6 26, 4 20, 10 18 C10 12, 18 10, 22 14 C24 8, 36 8, 38 16 C46 14, 50 22, 44 26 Z"
        fill={fill}
      />
    </g>
  )
}
