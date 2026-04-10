import { useCallback, useState } from 'react'

/**
 * Bumps version so components can re-read merged location data from localStorage + JSON.
 */
export function useLocationRegistry() {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  return { refresh, version }
}
