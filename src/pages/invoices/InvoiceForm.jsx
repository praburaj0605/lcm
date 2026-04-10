import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { FormField } from '../../components/forms/FormField'
import { FormActions } from '../../components/forms/FormActions'
import { Card } from '../../components/ui/Card'
import { useAppStore } from '../../store/useAppStore'
import { calcInvoiceTotals } from '../../utils/quoteCalculations'
import { emptyItem, validateInvoice, buildInvoicePayload, cloneForm } from './invoiceShared'

export function InvoiceForm({
  defaultValues,
  onSubmitRecord,
  submitLabel,
  title,
  subtitle,
  accent,
  listPath = '/invoices',
}) {
  const navigate = useNavigate()
  const clients = useAppStore((s) => s.clients)
  const quotations = useAppStore((s) => s.quotations)

  const snapshotRef = useRef(cloneForm(defaultValues))
  const [form, setForm] = useState(() => cloneForm(defaultValues))
  const [errors, setErrors] = useState({})

  const totalAmount = useMemo(() => calcInvoiceTotals(form.items), [form.items])
  const paid = Number(form.paidAmount) || 0
  const dueAmount = Math.max(0, totalAmount - paid)

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setItem(i, key, value) {
    setForm((f) => ({
      ...f,
      items: f.items.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)),
    }))
  }

  function addLine() {
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeLine(i) {
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const v = validateInvoice(form)
    setErrors(v)
    if (Object.keys(v).length) return
    onSubmitRecord(buildInvoicePayload(form))
  }

  function reset() {
    setForm(cloneForm(snapshotRef.current))
    setErrors({})
  }

  return (
    <Card title={title} subtitle={subtitle} accent={accent}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Invoice ID" htmlFor="invoiceId" hint="Auto-generated if empty">
            <Input id="invoiceId" value={form.invoiceId} onChange={(e) => setField('invoiceId', e.target.value)} />
          </FormField>
          <FormField label="Client" htmlFor="clientId" error={errors.clientId} required>
            <Select id="clientId" value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}>
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.clientName}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Quote reference" htmlFor="quoteId">
            <Select id="quoteId" value={form.quoteId} onChange={(e) => setField('quoteId', e.target.value)}>
              <option value="">None</option>
              {quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteId} — ${Number(q.finalAmount || 0).toFixed(2)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Due date" htmlFor="dueDate">
            <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setField('dueDate', e.target.value)} />
          </FormField>
          <FormField label="Payment method" htmlFor="paymentMethod">
            <Select id="paymentMethod" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
              <option value="Bank transfer">Bank transfer</option>
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
            </Select>
          </FormField>
          <FormField label="Payment status" htmlFor="paymentStatus">
            <Select id="paymentStatus" value={form.paymentStatus} onChange={(e) => setField('paymentStatus', e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </Select>
          </FormField>
        </div>

        <FormField label="Billing address" htmlFor="billingAddress" error={errors.billingAddress} required>
          <Textarea id="billingAddress" rows={3} value={form.billingAddress} onChange={(e) => setField('billingAddress', e.target.value)} />
        </FormField>

        <div className="rounded-none border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Items</h3>
            <Button type="button" variant="primary" className="!py-1 !text-xs" onClick={addLine}>
              + Add line
            </Button>
          </div>
          <div className="space-y-3">
            {form.items.map((it, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-none border border-dashed border-slate-300 p-3 md:grid-cols-12 dark:border-slate-600"
              >
                <div className="md:col-span-4">
                  <FormField label="Item" htmlFor={`in-${idx}`} error={errors[`item_${idx}_name`]}>
                    <Input id={`in-${idx}`} value={it.name} onChange={(e) => setItem(idx, 'name', e.target.value)} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Qty" htmlFor={`iq-${idx}`}>
                    <Input id={`iq-${idx}`} type="number" min="0" value={it.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Price" htmlFor={`ip-${idx}`}>
                    <Input id={`ip-${idx}`} type="number" min="0" step="0.01" value={it.price} onChange={(e) => setItem(idx, 'price', e.target.value)} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Tax %" htmlFor={`it-${idx}`}>
                    <Input id={`it-${idx}`} type="number" min="0" step="0.1" value={it.taxPercent} onChange={(e) => setItem(idx, 'taxPercent', e.target.value)} />
                  </FormField>
                </div>
                <div className="flex items-end md:col-span-2">
                  <Button type="button" variant="danger" className="w-full !py-2" onClick={() => removeLine(idx)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Paid amount (USD)" htmlFor="paidAmount">
            <Input id="paidAmount" type="number" min="0" step="0.01" value={form.paidAmount} onChange={(e) => setField('paidAmount', e.target.value)} />
          </FormField>
          <div className="rounded-none bg-slate-100 p-4 text-sm dark:bg-slate-800">
            <p className="font-semibold">Computed</p>
            <p>Total amount: ${totalAmount.toFixed(2)}</p>
            <p>Paid: ${paid.toFixed(2)}</p>
            <p className="text-lg font-black text-blue-700 dark:text-blue-300">Due: ${dueAmount.toFixed(2)}</p>
          </div>
        </div>

        <FormActions onReset={reset} onCancel={() => navigate(listPath)}>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </Card>
  )
}
