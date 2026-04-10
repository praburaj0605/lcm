import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { EnquiryForm } from './EnquiryForm'
import { cloneForm, mapEnquiryToForm } from './enquiryShared'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Button'
import { SendBrevoEmailModal } from '../../components/email/SendBrevoEmailModal'
import { buildEnquiryEmailContext, buildInternalEnquiryEmailContext } from '../../services/emailPlaceholders'
import './freightDeskEnquiry.css'

function EnquiriesEditBody({ id, enquiry, defaults, client, authUser, brevoSettings }) {
  const navigate = useNavigate()
  const updateEnquiry = useAppStore((s) => s.updateEnquiry)
  const [form, setForm] = useState(() => cloneForm(defaults))
  const [mailOpen, setMailOpen] = useState(false)
  const [mailKey, setMailKey] = useState(0)

  useEffect(() => {
    setForm(cloneForm(defaults))
  }, [defaults])

  const onControlledReset = useCallback(() => {
    setForm(cloneForm(defaults))
  }, [defaults])

  const sender = useMemo(
    () => ({
      name: authUser?.name,
      email: authUser?.email,
      company: brevoSettings.organizationName,
    }),
    [authUser?.name, authUser?.email, brevoSettings.organizationName],
  )

  const mailContextExternal = useMemo(
    () => (enquiry ? buildEnquiryEmailContext({ enquiry, client, sender }) : null),
    [enquiry, client, sender],
  )

  const mailContextInternal = useMemo(
    () => (enquiry ? buildInternalEnquiryEmailContext({ enquiry, client, sender }) : null),
    [enquiry, client, sender],
  )

  const defaultMailTo = enquiry?.contactEmail?.trim() || client?.email?.trim() || ''

  function handleSubmit(payload) {
    void (async () => {
      try {
        await updateEnquiry(id, { ...payload, pricingByUser: enquiry.pricingByUser || {} })
        toast.success('Enquiry updated')
        navigate('/enquiries', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not update enquiry')
      }
    })()
  }

  return (
    <div className="fd-skin-portal -mx-4 -mt-4 px-4 pb-8 pt-4 md:-mx-8 md:px-8">
      <div className="fd-shell mx-auto space-y-6">
        <div className="fd-topbar">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1>Edit enquiry</h1>
              <p className="text-sm">Same freight layout as new enquiry — route, cargo lines, and services in section 2.</p>
              <p className="mt-2 text-xs text-[var(--fd-t3)]">Save to return to the list.</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end sm:pt-1">
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
              <p className="max-w-xs text-[11px] leading-snug text-[var(--fd-t3)] sm:text-right">
                Client emails include company/contact block, enquiry summary, and line items. No accept/decline actions.
              </p>
            </div>
          </div>
        </div>

        <EnquiryForm
          key={id}
          defaultValues={defaults}
          form={form}
          setForm={setForm}
          onControlledReset={onControlledReset}
          skin="freight"
          showPageHeader={false}
          onSubmitRecord={handleSubmit}
          submitLabel="Save enquiry"
          title="Edit enquiry"
          subtitle="Update fields."
          accent="from-[var(--color-va-blue)] to-slate-700"
        />

        {mailContextExternal ? (
          <SendBrevoEmailModal
            key={mailKey}
            open={mailOpen}
            onClose={() => setMailOpen(false)}
            category="enquiry"
            placeholderContext={mailContextExternal}
            placeholderContextInternal={mailContextInternal || mailContextExternal}
            allowAudienceToggle
            defaultTo={defaultMailTo}
            title="Share enquiry (Brevo)"
          />
        ) : null}
      </div>
    </div>
  )
}

export function EnquiriesEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const enquiry = useAppStore((s) => s.enquiries.find((e) => e.id === id))
  const client = useAppStore((s) => s.clients.find((c) => c.id === enquiry?.clientId))
  const authUser = useAppStore((s) => s.auth.user)
  const brevoSettings = useAppStore((s) => s.brevoSettings)

  const defaults = useMemo(() => (enquiry ? mapEnquiryToForm(enquiry) : null), [enquiry])

  useEffect(() => {
    if (!enquiry) navigate('/enquiries', { replace: true })
  }, [enquiry, navigate])

  if (!enquiry || !defaults) return null

  return (
    <EnquiriesEditBody
      key={id}
      id={id}
      enquiry={enquiry}
      defaults={defaults}
      client={client}
      authUser={authUser}
      brevoSettings={brevoSettings}
    />
  )
}
