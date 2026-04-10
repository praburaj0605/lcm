const STORAGE_KEY = 'logistics-crm-storage'

/**
 * Export raw persisted JSON (same shape as zustand persist).
 * Useful for backup / debugging.
 */
export function exportAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function importAll(json) {
  if (!json || typeof json !== 'object') return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(json))
    return true
  } catch {
    return false
  }
}

export function clearStorageKey() {
  localStorage.removeItem(STORAGE_KEY)
}

export { STORAGE_KEY }
