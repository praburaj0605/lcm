import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    typeof useAppStore.persist?.hasHydrated === 'function'
      ? useAppStore.persist.hasHydrated()
      : false,
  )

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    return unsub
  }, [])

  return hydrated
}
