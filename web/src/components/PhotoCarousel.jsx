import { useEffect, useState } from 'react'

// Carrousel de 2-3 photos qui alternent en fondu.
// Passe automatiquement toutes les `interval` ms.
// Si aucune image dispo -> ne rend rien (le parent gere le placeholder).
export default function PhotoCarousel({ images = [], alt = '', interval = 3200, className = '' }) {
  const clean = images.filter(Boolean)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (clean.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % clean.length)
    }, interval)
    return () => clearInterval(id)
  }, [clean.length, interval])

  if (!clean.length) return null

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {clean.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={alt}
          loading={i === 0 ? 'eager' : 'lazy'}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      {/* Indicateurs discrets */}
      {clean.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {clean.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full bg-white/80 transition-all"
              style={{ width: i === index ? 16 : 6 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
