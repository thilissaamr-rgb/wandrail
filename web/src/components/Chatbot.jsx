import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import Icon from './Icon'

function RobotHead({ size = 48 }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="60" y1="8" x2="60" y2="22" stroke="#B0BEC5" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="6" r="4" fill="#4FC3F7" />
      <circle cx="60" cy="6" r="4" fill="#4FC3F7" opacity="0.5">
        <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Head shape */}
      <rect x="22" y="22" rx="26" ry="26" width="76" height="68" fill="white" stroke="#E0E0E0" strokeWidth="2" />
      <rect x="22" y="22" rx="26" ry="26" width="76" height="68" fill="url(#headShine)" />

      {/* Ears */}
      <rect x="10" y="42" rx="4" ry="4" width="14" height="20" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      <rect x="12" y="46" rx="2" ry="2" width="10" height="12" fill="#4FC3F7" opacity="0.3" />
      <rect x="96" y="42" rx="4" ry="4" width="14" height="20" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      <rect x="98" y="46" rx="2" ry="2" width="10" height="12" fill="#4FC3F7" opacity="0.3" />

      {/* Eye visor */}
      <rect x="34" y="38" rx="12" ry="12" width="52" height="24" fill="#1A2332" />

      {/* Left eye */}
      <circle cx="48" cy="50" r="8" fill="#0D1B2A" stroke="#4FC3F7" strokeWidth="1.5" />
      <circle cx="48" cy="50" r="5" fill="#4FC3F7">
        <animate attributeName="r" values="5;4.5;5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="46" cy="48" r="1.8" fill="white" opacity="0.8" />

      {/* Right eye */}
      <circle cx="72" cy="50" r="8" fill="#0D1B2A" stroke="#4FC3F7" strokeWidth="1.5" />
      <circle cx="72" cy="50" r="5" fill="#4FC3F7">
        <animate attributeName="r" values="5;4.5;5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="70" cy="48" r="1.8" fill="white" opacity="0.8" />

      {/* Mouth / speaker grille */}
      <rect x="44" y="70" rx="6" ry="6" width="32" height="12" fill="#E3F2FD" stroke="#B3E5FC" strokeWidth="1" />
      <line x1="50" y1="72" x2="50" y2="80" stroke="#4FC3F7" strokeWidth="1.5" opacity="0.5" />
      <line x1="56" y1="72" x2="56" y2="80" stroke="#4FC3F7" strokeWidth="1.5" opacity="0.7" />
      <line x1="62" y1="72" x2="62" y2="80" stroke="#4FC3F7" strokeWidth="1.5" opacity="0.5" />
      <line x1="68" y1="72" x2="68" y2="80" stroke="#4FC3F7" strokeWidth="1.5" opacity="0.3" />

      {/* Cheek blush */}
      <circle cx="34" cy="62" r="5" fill="#4FC3F7" opacity="0.12" />
      <circle cx="86" cy="62" r="5" fill="#4FC3F7" opacity="0.12" />

      {/* Neck hint */}
      <rect x="48" y="90" rx="3" width="24" height="10" fill="#ECEFF1" stroke="#E0E0E0" strokeWidth="1" />

      {/* Body top peek */}
      <path d="M32 100 Q32 96 40 96 L80 96 Q88 96 88 100 L92 114 Q92 118 88 118 L32 118 Q28 118 28 114 Z" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      <rect x="46" y="102" rx="4" ry="4" width="28" height="10" fill="#E3F2FD" stroke="#B3E5FC" strokeWidth="1" />
      <line x1="52" y1="104" x2="52" y2="110" stroke="#4FC3F7" strokeWidth="1.2" opacity="0.5" />
      <line x1="56" y1="104" x2="56" y2="110" stroke="#4FC3F7" strokeWidth="1.2" opacity="0.7" />
      <line x1="60" y1="104" x2="60" y2="110" stroke="#4FC3F7" strokeWidth="1.2" opacity="0.5" />
      <line x1="64" y1="104" x2="64" y2="110" stroke="#4FC3F7" strokeWidth="1.2" opacity="0.3" />
      <line x1="68" y1="104" x2="68" y2="110" stroke="#4FC3F7" strokeWidth="1.2" opacity="0.5" />

      <defs>
        <linearGradient id="headShine" x1="30" y1="22" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    { role: 'bot', text: 'Bonjour ! Je suis l\'assistant Wandrail. Posez-moi une question sur les destinations, le CO₂, ou les statistiques.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function send() {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMsgs(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await api.chat(q)
      setMsgs(prev => [...prev, { role: 'bot', text: res.message, data: res.data }])
    } catch {
      setMsgs(prev => [...prev, { role: 'bot', text: 'Désolé, une erreur est survenue. Réessayez.' }])
    }
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const suggestions = [
    'Combien de gares ?',
    'Où aller en Bretagne ?',
    'Impact carbone du train',
    'Nantes',
  ]

  return (
    <>
      {/* Floating button: robot head peeking + bubble */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1">
        {/* Speech hint when closed */}
        {!open && (
          <div className="mb-1 mr-1 animate-[fadeSlide_0.4s_ease-out] rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-lg border border-gray-100">
            Besoin d'aide ?
            <div className="absolute -bottom-1 right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-gray-100 bg-white" />
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="group relative flex items-center gap-0 transition-transform hover:scale-105 active:scale-95"
          aria-label="Ouvrir le chatbot"
        >
          {open ? (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-eco text-white shadow-lg">
              <Icon name="x" className="h-6 w-6" />
            </div>
          ) : (
            <div className="relative flex h-16 w-16 items-center justify-center drop-shadow-xl">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-50 to-white shadow-lg" />
              <div className="relative">
                <RobotHead size={52} />
              </div>
              {/* Green online dot */}
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-eco shadow-sm" />
            </div>
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-[#0D2137] to-[#1A3A5C] px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 p-0.5">
              <RobotHead size={34} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Assistant Wandrail</div>
              <div className="flex items-center gap-1.5 text-[0.65rem] text-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En ligne
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-2'}`}>
                {m.role === 'bot' && (
                  <div className="mt-1 flex-shrink-0">
                    <RobotHead size={24} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[0.82rem] leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-eco text-white rounded-br-md'
                      : 'bg-card2 text-ink rounded-bl-md'
                  }`}
                >
                  <MessageContent text={m.text} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="mt-1 flex-shrink-0">
                  <RobotHead size={24} />
                </div>
                <div className="rounded-2xl rounded-bl-md bg-card2 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only if just the welcome message) */}
          {msgs.length === 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                  className="rounded-full border border-line bg-card px-2.5 py-1 text-[0.7rem] font-medium text-muted transition hover:border-blue-300 hover:text-blue-600"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-line px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 focus-within:border-blue-400/50 transition">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-muted outline-none"
                maxLength={500}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-eco text-white transition disabled:opacity-40 hover:bg-eco/90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

function MessageContent({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
        }
        const lines = part.split('\n')
        return lines.map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ))
      })}
    </>
  )
}
