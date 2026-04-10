import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { FormField } from '../../components/forms/FormField'
import { FormActions } from '../../components/forms/FormActions'
import { Card } from '../../components/ui/Card'
import { useAppStore } from '../../store/useAppStore'
import { calcQuoteTotals } from '../../utils/quoteCalculations'
import { emptyItem, validateQuotation, buildQuotationPayload, cloneForm } from './quotationShared'

export function QuotationForm({
  defaultValues,
  onSubmitRecord,
  submitLabel,
  title,
  subtitle,
  accent,
  listPath = '/quotations',
}) {
  const navigate = useNavigate()
  const clients = useAppStore((s) => s.clients)
  const enquiries = useAppStore((s) => s.enquiries)

  const snapshotRef = useRef(cloneForm(defaultValues))
  const [form, setForm] = useState(() => cloneForm(defaultValues))
  const [errors, setErrors] = useState({})

  const totals = useMemo(() => calcQuoteTotals(form.items, form.discount), [form.items, form.discount])

  const enquiriesForClient = useMemo(
    () => enquiries.filter((e) => !form.clientId || e.clientId === form.clientId),
    [enquiries, form.clientId],
  )

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
    const v = validateQuotation(form)
    setErrors(v)
    if (Object.keys(v).length) return
    onSubmitRecord(buildQuotationPayload(form))
  }

  function reset() {
    setForm(cloneForm(snapshotRef.current))
    setErrors({})
  }

  return (
    <Card title={title} subtitle={subtitle} accent={accent}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Quote ID" htmlFor="quoteId" hint="Auto-generated if empty">
            <Input id="quoteId" value={form.quoteId} onChange={(e) => setField('quoteId', e.target.value)} />
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
          <FormField label="Enquiry reference" htmlFor="enquiryId">
            <Select id="enquiryId" value={form.enquiryId} onChange={(e) => setField('enquiryId', e.target.value)}>
              <option value="">None</option>
              {enquiriesForClient.map((en) => (
                <option key={en.id} value={en.id}>
                  {en.enquiryId} — {en.description?.slice(0, 40)}…
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status" htmlFor="status">
            <Select id="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
            </Select>
          </FormField>
        </div>

        <div className="rounded-none border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Line items</h3>
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
                  <FormField label="Item name" htmlFor={`n-${idx}`} error={errors[`item_${idx}_name`]}>
                    <Input id={`n-${idx}`} value={it.name} onChange={(e) => setItem(idx, 'name', e.target.value)} />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Qty" htmlFor={`q-${idx}`}>
                    <Input
                      id={`q-${idx}`}
                      type="number"
                      min="0"
                      step="1"
                      value={it.quantity}
                      onChange={(e) => setItem(idx, 'quantity', e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Price" htmlFor={`p-${idx}`}>
                    <Input
                      id={`p-${idx}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.price}
                      onChange={(e) => setItem(idx, 'price', e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="md:col-span-2">
                  <FormField label="Tax %" htmlFor={`t-${idx}`}>
                    <Input
                      id={`t-${idx}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={it.taxPercent}
                      onChange={(e) => setItem(idx, 'taxPercent', e.target.value)}
                    />
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
          <FormField label="Discount (USD)" htmlFor="discount">
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={form.discount}
              onChange={(e) => setField('discount', e.target.value)}
            />
          </FormField>
          <div className="rounded-none bg-slate-100 p-4 text-sm dark:bg-slate-800">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Totals (auto)</p>
            <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
            <p>Tax: ${totals.taxTotal.toFixed(2)}</p>
            <p>Before discount: ${totals.total.toFixed(2)}</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">Final: ${totals.finalAmount.toFixed(2)}</p>
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
