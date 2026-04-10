import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { QuotationForm } from './QuotationForm'
import { mapQuotationToForm } from './quotationShared'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { SendBrevoEmailModal } from '../../components/email/SendBrevoEmailModal'
import { buildQuotationEmailContext, buildInternalQuotationEmailContext } from '../../services/emailPlaceholders'

export function QuotationsEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quotation = useAppStore((s) => s.quotations.find((q) => q.id === id))
  const client = useAppStore((s) => s.clients.find((c) => c.id === quotation?.clientId))
  const enquiry = useAppStore((s) => s.enquiries.find((e) => e.id === quotation?.enquiryId))
  const authUser = useAppStore((s) => s.auth.user)
  const brevoSettings = useAppStore((s) => s.brevoSettings)
  const updateQuotation = useAppStore((s) => s.updateQuotation)
  const [mailOpen, setMailOpen] = useState(false)
  const [mailKey, setMailKey] = useState(0)

  const defaults = useMemo(() => (quotation ? mapQuotationToForm(quotation) : null), [quotation])

  const sender = useMemo(
    () => ({
      name: authUser?.name,
      email: authUser?.email,
      company: brevoSettings.organizationName,
    }),
    [authUser?.name, authUser?.email, brevoSettings.organizationName],
  )

  const respondBaseUrl =
    (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')) ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const mailContextExternal = useMemo(
    () =>
      quotation
        ? buildQuotationEmailContext({
            quotation,
            client,
            enquiry,
            sender,
            respondBaseUrl,
            includeClientActions: true,
          })
        : null,
    [quotation, client, enquiry, sender, respondBaseUrl],
  )

  const mailContextInternal = useMemo(
    () =>
      quotation
        ? buildInternalQuotationEmailContext({ quotation, client, enquiry, sender, respondBaseUrl })
        : null,
    [quotation, client, enquiry, sender, respondBaseUrl],
  )

  const defaultMailTo =
    client?.contactPersonEmail?.trim() || client?.email?.trim() || enquiry?.contactEmail?.trim() || ''

  useEffect(() => {
    if (!quotation) navigate('/quotations', { replace: true })
  }, [quotation, navigate])

  function handleSubmit(payload) {
    void (async () => {
      try {
        await updateQuotation(id, payload)
        toast.success('Quotation updated')
        navigate('/quotations', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not update quotation')
      }
    })()
  }

  if (!defaults) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit quotation</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Save to return to the list.</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMailKey((k) => k + 1)
              setMailOpen(true)
            }}
          >
            Share via Brevo
          </Button>
          <p className="max-w-xs text-right text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            Emails include itemised pricing, client details, totals, and Accept / Decline buttons. Those links update status
            to Accepted or Rejected when opened in this same browser (local CRM data). Prefer status &quot;Sent&quot; before
            sharing with the client.
          </p>
        </div>
      </div>
      <QuotationForm
        key={id}
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Save quotation"
        title="Edit quotation"
        subtitle="Update line items and totals."
        accent="from-emerald-500 to-blue-700"
      />
      {mailContextExternal ? (
        <SendBrevoEmailModal
          key={mailKey}
          open={mailOpen}
          onClose={() => setMailOpen(false)}
          category="quotation"
          placeholderContext={mailContextExternal}
          placeholderContextInternal={mailContextInternal || mailContextExternal}
          allowAudienceToggle
          defaultTo={defaultMailTo}
          title="Share quotation (Brevo)"
        />
      ) : null}
    </div>
  )
}
