import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { ClientForm } from './ClientForm'
import { emptyClient } from './clientShared'
import { toast } from 'sonner'

export function ClientsCreate() {
  const navigate = useNavigate()
  const addClient = useAppStore((s) => s.addClient)

  const defaults = useMemo(() => emptyClient(), [])

  function handleSubmit(form) {
    void (async () => {
      try {
        await addClient({ ...form })
        toast.success('Client created')
        navigate('/clients', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not create client')
      }
    })()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New client</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">After saving, you will return to the client list.</p>
      </div>
      <ClientForm
        key="create"
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Create client"
        title="Client details"
        subtitle="Capture maximum operational context."
        accent="from-blue-600 to-emerald-500"
      />
    </div>
  )
}
