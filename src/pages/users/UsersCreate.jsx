import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { UserForm } from './UserForm'
import { emptyUser } from './userShared'
import { toast } from 'sonner'

export function UsersCreate() {
  const navigate = useNavigate()
  const addUser = useAppStore((s) => s.addUser)

  const defaults = useMemo(() => emptyUser(), [])

  function handleSubmit(form) {
    void (async () => {
      try {
        await addUser(form)
        toast.success('User saved')
        navigate('/users', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not create user')
      }
    })()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New user</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">They can sign in with this email once created.</p>
      </div>
      <UserForm
        key="create"
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Create user"
        title="User"
        subtitle="Email must match what they type on the login screen."
        accent="from-indigo-600 to-violet-700"
      />
    </div>
  )
}
