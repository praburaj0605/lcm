import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { InvoiceForm } from './InvoiceForm'
import { emptyInvoice } from './invoiceShared'
import { toast } from 'sonner'

export function InvoicesCreate() {
  const navigate = useNavigate()
  const addInvoice = useAppStore((s) => s.addInvoice)

  const defaults = useMemo(() => emptyInvoice(), [])

  function handleSubmit(payload) {
    void (async () => {
      try {
        await addInvoice(payload)
        toast.success('Invoice created')
        navigate('/invoices', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not create invoice')
      }
    })()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New invoice</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Save to return to the list.</p>
      </div>
      <InvoiceForm
        key="create"
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Create invoice"
        title="Invoice"
        subtitle="Billing, payments, and automatic due balance."
        accent="from-red-600 to-amber-400"
      />
    </div>
  )
}
