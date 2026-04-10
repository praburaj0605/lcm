import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useEffectiveRole } from '../hooks/useEffectiveRole'

/** Renders child routes only if the current user's role is in `roles`. */
export function RoleRoute({ roles }) {
  const user = useAppStore((s) => s.auth.user)
  const location = useLocation()
  const effectiveRole = useEffectiveRole()

  const allowed = Boolean(user?.email && effectiveRole && roles.includes(effectiveRole))

  if (!allowed) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />
  }
  return <Outlet />
}

/**
 * Blocks pricing-only users from sales pipeline routes (redirect to enquiries).
 */
export function SalesPipelineRoute() {
  const role = useEffectiveRole()
  const location = useLocation()
  if (role === 'pricing') {
    return <Navigate to="/enquiries" replace state={{ from: location }} />
  }
  return <Outlet />
}
