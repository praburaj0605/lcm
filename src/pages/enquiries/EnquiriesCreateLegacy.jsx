import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { EnquiryForm } from './EnquiryForm'
import { emptyEnquiry } from './enquiryShared'
import { toast } from 'sonner'

/** Original full create form (light/dark via global theme). Kept for users who prefer the legacy layout. */
export function EnquiriesCreateLegacy() {
  const navigate = useNavigate()
  const addEnquiry = useAppStore((s) => s.addEnquiry)

  const defaults = useMemo(() => emptyEnquiry(), [])

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Legacy new enquiry</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Original create form with the standard page layout. For the FreightDesk-style flow, use{' '}
          <Link className="font-medium text-[var(--color-va-blue)] underline-offset-2 hover:underline dark:text-blue-400" to="/enquiries/new">
            New enquiry
          </Link>
          .
        </p>
      </div>
      <EnquiryForm
        key="create-legacy"
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Create enquiry"
        title="Enquiry details"
        subtitle="Tie leads to clients with full lifecycle fields."
        accent="from-amber-400 to-blue-700"
      />
    </div>
  )
}
