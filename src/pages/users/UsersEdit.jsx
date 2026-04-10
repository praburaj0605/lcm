import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { UserForm } from './UserForm'
import { cloneForm } from './userShared'
import { toast } from 'sonner'

export function UsersEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAppStore((s) => s.users.find((u) => u.id === id))
  const updateUser = useAppStore((s) => s.updateUser)

  const defaults = useMemo(
    () => (user ? { email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url ?? '' } : null),
    [user],
  )

  useEffect(() => {
    if (!user) navigate('/users', { replace: true })
  }, [user, navigate])

  function handleSubmit(form) {
    void (async () => {
      try {
        await updateUser(id, form)
        toast.success('User updated')
        navigate('/users', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not update user')
      }
    })()
  }

  if (!defaults) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit user</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Changing role takes effect on next login.</p>
      </div>
      <UserForm
        key={id}
        defaultValues={cloneForm(defaults)}
        onSubmitRecord={handleSubmit}
        submitLabel="Save user"
        title="Edit user"
        subtitle="Update profile and role."
        accent="from-indigo-600 to-violet-700"
      />
    </div>
  )
}
