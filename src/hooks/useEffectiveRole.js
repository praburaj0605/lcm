import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

/**
 * Prefer role from users JSON (source of truth); fall back to session `auth.user.role`.
 * Fixes legacy sessions missing `role` and keeps RBAC in sync after JSON edits.
 */
export function useEffectiveRole() {
  const user = useAppStore((s) => s.auth.user)
  const users = useAppStore((s) => s.users)

  return useMemo(() => {
    if (!user?.email) return undefined
    if (users?.length) {
      const u = users.find((x) => x.email.toLowerCase() === String(user.email).toLowerCase())
      if (u?.role) return u.role
    }
    return user.role
  }, [user, users])
}
