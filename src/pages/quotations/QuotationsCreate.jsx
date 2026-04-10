import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { QuotationForm } from './QuotationForm'
import { emptyQuotation } from './quotationShared'
import { toast } from 'sonner'

export function QuotationsCreate() {
  const navigate = useNavigate()
  const addQuotation = useAppStore((s) => s.addQuotation)

  const defaults = useMemo(() => emptyQuotation(), [])

  function handleSubmit(payload) {
    void (async () => {
      try {
        await addQuotation(payload)
        toast.success('Quotation created')
        navigate('/quotations', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not create quotation')
      }
    })()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New quotation</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Save to return to the list.</p>
      </div>
      <QuotationForm
        key="create"
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Create quotation"
        title="Quotation"
        subtitle="Line items, tax, discounts, and rolling totals."
        accent="from-emerald-500 to-blue-700"
      />
    </div>
  )
}
