import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const KEY = (email) => `wandrail:avatar:${(email || '').toLowerCase().trim()}`

// Lit / ecrit l avatar utilisateur en base64 dans localStorage.
// Cle par email pour supporter le changement de compte.
export function loadAvatar(email) {
  if (!email) return null
  try {
    return localStorage.getItem(KEY(email)) || null
  } catch {
    return null
  }
}

function saveAvatar(email, dataUrl) {
  if (!email) return
  try {
    if (dataUrl) localStorage.setItem(KEY(email), dataUrl)
    else localStorage.removeItem(KEY(email))
  } catch {
    /* quota exceeded, ignored */
  }
}

// Silhouette "bonhomme grise" (fallback quand aucune photo).
function DefaultSilhouette({ className = 'h-full w-full' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="avatar-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#avatar-bg)" />
      {/* Tete */}
      <circle cx="50" cy="38" r="18" fill="#CBD5E1" />
      {/* Buste */}
      <path d="M20 100 C 20 76 34 66 50 66 C 66 66 80 76 80 100 Z" fill="#CBD5E1" />
    </svg>
  )
}

// Avatar avec option upload.
// - Si l utilisateur a deja upload une photo, on l affiche.
// - Sinon on affiche la silhouette grise (bonhomme).
// - En mode edit, click sur l avatar ouvre le picker de fichiers.
// - Redimensionnement client-side a 256x256 pour ne pas saturer localStorage.
export default function Avatar({
  email,
  size = 96,
  editable = false,
  onChange,
  className = '',
}) {
  const [src, setSrc] = useState(() => loadAvatar(email))
  const inputRef = useRef(null)

  useEffect(() => {
    setSrc(loadAvatar(email))
  }, [email])

  const pickFile = () => inputRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    try {
      const dataUrl = await resizeAndEncode(file, 256)
      saveAvatar(email, dataUrl)
      setSrc(dataUrl)
      onChange?.(dataUrl)
    } catch {
      /* ignore */
    }
  }

  const clear = () => {
    saveAvatar(email, null)
    setSrc(null)
    onChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const dim = { width: size, height: size }

  return (
    <div className={`relative ${className}`} style={dim}>
      <div
        className="overflow-hidden rounded-2xl shadow-md ring-2 ring-white/50 dark:ring-white/10"
        style={dim}
      >
        {src ? (
          <img src={src} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <DefaultSilhouette />
        )}
      </div>

      {editable && (
        <>
          <button
            type="button"
            onClick={pickFile}
            aria-label="Changer la photo"
            className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-eco text-white shadow-lg ring-2 ring-white transition hover:scale-110 active:scale-95 dark:ring-slate-900"
          >
            <Icon name="settings" className="h-4 w-4" />
          </button>
          {src && (
            <button
              type="button"
              onClick={clear}
              aria-label="Retirer la photo"
              className="absolute -bottom-2 -left-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-2 ring-white transition hover:text-rose-500 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-900"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </>
      )}
    </div>
  )
}

// Redimensionne un fichier image en carré {max}×{max} et retourne un dataURL JPEG.
function resizeAndEncode(file, max) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        // Crop carre au centre
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        const canvas = document.createElement('canvas')
        canvas.width = max
        canvas.height = max
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, side, side, 0, 0, max, max)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
