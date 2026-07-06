import { useEffect, useRef, useState } from 'react'

// Compteur anime : easing cubic-out, RAF, respecte prefers-reduced-motion.
// Declenche la premiere fois que l'element passe dans le viewport
// (via IntersectionObserver) pour eviter d'animer hors ecran.
export function useCountUp(target, { duration = 1200, decimals = 0 } = {}) {
  const [value, setValue] = useState(0)
  const nodeRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (target == null || Number.isNaN(Number(target))) return
    const to = Number(target)

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const run = () => {
      if (startedRef.current) return
      startedRef.current = true
      if (reduced || duration <= 0) {
        setValue(to)
        return
      }
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        const v = to * eased
        setValue(decimals > 0 ? Number(v.toFixed(decimals)) : Math.round(v))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    if (!nodeRef.current || !('IntersectionObserver' in window)) {
      run()
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run()
            io.disconnect()
          }
        })
      },
      { threshold: 0.2 },
    )
    io.observe(nodeRef.current)
    return () => io.disconnect()
  }, [target, duration, decimals])

  return [value, nodeRef]
}
