import { useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { EnquiryForm } from './EnquiryForm'
import { cloneForm, emptyEnquiry } from './enquiryShared'
import { toast } from 'sonner'
import './freightDeskEnquiry.css'

export function EnquiriesCreate() {
  const navigate = useNavigate()
  const addEnquiry = useAppStore((s) => s.addEnquiry)
  const blank = useMemo(() => emptyEnquiry(), [])
  const [form, setForm] = useState(() => cloneForm(blank))

  const onControlledReset = useCallback(() => {
    setForm(cloneForm(emptyEnquiry()))
  }, [])

  function handleSubmit(payload) {
    void (async () => {
      try {
        await addEnquiry({ ...payload, pricingByUser: {} })
        toast.success('Enquiry created')
        navigate('/enquiries', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not create enquiry')
      }
    })()
  }

  return (
    <div className="fd-skin-portal -mx-4 -mt-4 px-4 pb-8 pt-4 md:-mx-8 md:px-8">
      <div className="fd-shell mx-auto space-y-6">
        <div className="fd-topbar">
          <h1>New enquiry</h1>
          <p>
            Route, cargo lines, and services are in <strong className="text-[var(--fd-t1)]">section 2 — Cargo details</strong>.
            Theme follows your light/dark setting.
          </p>
          <p className="mt-2 text-xs text-[var(--fd-t3)]">
            Prefer the classic layout?{' '}
            <Link
              className="font-medium text-[var(--fd-accent)] underline-offset-2 hover:underline"
              to="/enquiries/new-legacy"
            >
              Legacy new enquiry
            </Link>
          </p>
        </div>

        <EnquiryForm
          key="create-freight"
          defaultValues={blank}
          form={form}
          setForm={setForm}
          onControlledReset={onControlledReset}
          skin="freight"
          showPageHeader={false}
          onSubmitRecord={handleSubmit}
          submitLabel="Create enquiry"
          title="Enquiry details"
          subtitle="Tie leads to clients with full lifecycle fields."
          accent="from-[var(--color-va-blue)] to-slate-700"
        />
      </div>
    </div>
  )
}
