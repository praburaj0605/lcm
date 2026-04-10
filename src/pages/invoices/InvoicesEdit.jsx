import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { InvoiceForm } from './InvoiceForm'
import { mapInvoiceToForm } from './invoiceShared'
import { toast } from 'sonner'

export function InvoicesEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoice = useAppStore((s) => s.invoices.find((inv) => inv.id === id))
  const updateInvoice = useAppStore((s) => s.updateInvoice)

  const defaults = useMemo(() => (invoice ? mapInvoiceToForm(invoice) : null), [invoice])

  useEffect(() => {
    if (!invoice) navigate('/invoices', { replace: true })
  }, [invoice, navigate])

  function handleSubmit(payload) {
    void (async () => {
      try {
        await updateInvoice(id, payload)
        toast.success('Invoice updated')
        navigate('/invoices', { replace: true })
      } catch (e) {
        const d = e?.response?.data?.detail
        toast.error(typeof d === 'string' ? d : e?.message || 'Could not update invoice')
      }
    })()
  }

  if (!defaults) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit invoice</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Save to return to the list.</p>
      </div>
      <InvoiceForm
        key={id}
        defaultValues={defaults}
        onSubmitRecord={handleSubmit}
        submitLabel="Save invoice"
        title="Edit invoice"
        subtitle="Update billing and items."
        accent="from-red-600 to-amber-400"
      />
    </div>
  )
}
