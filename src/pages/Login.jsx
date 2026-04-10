import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { FormField } from '../components/forms/FormField'
import { FormActions } from '../components/forms/FormActions'
import { Card } from '../components/ui/Card'
import { toast } from 'sonner'
import { isApiMode } from '../services/apiMode'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAppStore((s) => s.auth.token)
  const login = useAppStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  const from = location.state?.from?.pathname || '/dashboard'

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  function validate() {
    const e = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email'
    if (!password) e.password = 'Password is required (mock)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(ev) {
    ev.preventDefault()
    if (!validate()) {
      toast.error('Fix validation errors')
      return
    }
    const res = await login(email.trim(), password)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Welcome back!')
    navigate(from, { replace: true })
  }

  return (
    <div className="va-canvas flex min-h-svh items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card
          title="Logistics CRM"
          subtitle={
            isApiMode()
              ? 'API mode: use a user from the backend database (e.g. admin@demo.com, sales@demo.com). Password may be any value when the server uses email-only sign-in.'
              : 'Sign in with a user created under Users (admin). Try admin@demo.com, sales@demo.com, pricing@demo.com, or boss@demo.com — any password.'
          }
          accent="from-[var(--color-va-blue)] via-blue-400 to-amber-400"
        >
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Email" htmlFor="email" error={errors.email} required>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
            </FormField>
            <FormField label="Password" htmlFor="password" error={errors.password} required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
            </FormField>
            <FormActions
              onReset={() => {
                setEmail('')
                setPassword('')
                setErrors({})
              }}
            >
              <Button type="submit" variant="primary" className="min-w-[140px] sm:flex-1">
                Sign in
              </Button>
            </FormActions>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
