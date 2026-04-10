import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { ClientForm } from './ClientForm'
import { mapClientToForm } from './clientShared'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { SendBrevoEmailModal } from '../../components/email/SendBrevoEmailModal'
import { buildClientEmailContext } from '../../services/emailPlaceholders'

export function ClientsEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const client = useAppStore((s) => s.clients.find((c) => c.id === id))
  const authUser = useAppStore((s) => s.auth.user)
  const brevoSettings = useAppStore((s) => s.brevoSettings)
  const updateClient = useAppStore((s) => s.updateClient)
  const [mailOpen, setMailOpen] = useState(false)
  const [mailKey, setMailKey] = useState(0)

  const defaults = useMemo(() => (client ? mapClientToForm(client) : null), [client])

  const sender = useMemo(
    () => ({
      name: authUser?.name,
      email: authUser?.email,
      company: brevoSettings.organizationName,
    }),
    [authUser?.name, authUser?.email, brevoSettings.organizationName],
  )

  const mailContext = useMemo(
    () => (client ? buildClientEmailContext({ client, sender }) : null),
    [client, sender],
  )

  const defaultMailTo = client?.contactPersonEmail?.trim() || client?.email?.trim() || ''

  useEffect(() => {
    if (!client) navigate('/clients', { replace: true })
  }, [client, navigate])

  function handleSubmit(form) {
    void (async () => {
      try {
        await updateClient(id, { ...form })
        toast.success('Client updated')
        navigate('/clients', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not update client')
      }
    })()
  }

  if (!defaults) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit client</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Save changes to return to the list.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setMailKey((k) => k + 1)
            setMailOpen(true)
          }}
        >
          Email client (Brevo)
        </Button>
      </div>
      <ClientForm
        key={id}
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Save changes"
        title="Edit client"
        subtitle="Update profile fields."
        accent="from-blue-600 to-emerald-500"
      />
      {mailContext ? (
        <SendBrevoEmailModal
          key={mailKey}
          open={mailOpen}
          onClose={() => setMailOpen(false)}
          category="client_email"
          placeholderContext={mailContext}
          defaultTo={defaultMailTo}
          title="Email client (Brevo)"
        />
      ) : null}
    </div>
  )
}
