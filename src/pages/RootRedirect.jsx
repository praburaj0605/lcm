import { Navigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function RootRedirect() {
  const token = useAppStore((s) => s.auth.token)
  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}
