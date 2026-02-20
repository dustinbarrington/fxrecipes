import { useEffect, useState } from 'react'

export default function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)

  useEffect(() => {
    let startY = 0
    const handleStart = (e) => {
      if (window.scrollY === 0) startY = e.touches[0].clientY
    }
    const handleMove = (e) => {
      const delta = e.touches[0].clientY - startY
      if (window.scrollY === 0 && delta > 70) setPulling(true)
    }
    const handleEnd = () => {
      if (pulling && onRefresh) onRefresh()
      setPulling(false)
      startY = 0
    }

    window.addEventListener('touchstart', handleStart, { passive: true })
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [onRefresh, pulling])

  return pulling
}
