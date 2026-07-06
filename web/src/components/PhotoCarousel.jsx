import { useEffect, useMemo, useRef, useState } from 'react'

// Carrousel photo bulletproof.
// - Precharge TOUTES les images en memoire avant de demarrer la rotation
//   (evite tout flicker/image cassee/decalage visuel).
// - Crossfade franc via opacity + z-index (l'image active passe au-dessus).
// - Rotation automatique toutes les `interval` ms (par defaut 5000).
// - Ignore les images qui echouent au chargement (onError -> retire du set).
export default function PhotoCarousel({
  images = [],
  alt = '',
  interval = 5000,
  className = '',
  showIndicators = true,
}) {
  const initial = useMemo(() => images.filter(Boolean), [images])
  const [ready, setReady] = useState(false)
  const [urls, setUrls] = useState(initial)
  const [index, setIndex] = useState(0)
  const timerRef = useRef(null)

  // Precharge en parallele. On ne rend rien tant qu'aucune image n'est OK.
  useEffect(() => {
    if (!initial.length) return
    let cancelled = false
    const loaders = initial.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve({ src, ok: true })
          img.onerror = () => resolve({ src, ok: false })
          img.src = src
        }),
    )
    Promise.all(loaders).then((results) => {
      if (cancelled) return
      const ok = results.filter((r) => r.ok).map((r) => r.src)
      setUrls(ok.length ? ok : initial)
      setReady(true)
      setIndex(0)
    })
    return () => {
      cancelled = true
    }
  }, [initial])

  // Rotation.
  useEffect(() => {
    if (!ready || urls.length <= 1) return
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % urls.length)
    }, interval)
    return () => clearInterval(timerRef.current)
  }, [ready, urls.length, interval])

  if (!initial.length) return null

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {urls.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={i === 0 ? 'high' : 'auto'}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out will-change-[opacity]"
          style={{
            opacity: ready && i === index ? 1 : 0,
            zIndex: i === index ? 1 : 0,
          }}
        />
      ))}
      {showIndicators && urls.length > 1 && ready && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Photo ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full bg-white/90 transition-all duration-500"
              style={{ width: i === index ? 22 : 6, opacity: i === index ? 1 : 0.55 }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
