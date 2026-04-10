import { nanoid } from 'nanoid'
import { parseISO } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { calcInvoiceTotals } from '../../utils/quoteCalculations'

export function emptyItem() {
  return { name: '', quantity: 1, price: 0, taxPercent: 0 }
}

export function emptyInvoice() {
  return {
    invoiceId: '',
    clientId: '',
    quoteId: '',
    billingAddress: '',
    items: [emptyItem()],
    paidAmount: 0,
    paymentStatus: 'Pending',
    paymentMethod: 'Bank transfer',
    dueDate: '',
  }
}

export function mapInvoiceToForm(inv) {
  return {
    invoiceId: inv.invoiceId ?? '',
    clientId: inv.clientId ?? '',
    quoteId: inv.quoteId ?? '',
    billingAddress: inv.billingAddress ?? '',
    items: inv.items?.length ? JSON.parse(JSON.stringify(inv.items)) : [emptyItem()],
    paidAmount: inv.paidAmount ?? 0,
    paymentStatus: inv.paymentStatus ?? 'Pending',
    paymentMethod: inv.paymentMethod ?? 'Bank transfer',
    dueDate: inv.dueDate ?? '',
  }
}

export function validateInvoice(form) {
  const e = {}
  if (!form.clientId) e.clientId = 'Client is required'
  if (!form.billingAddress?.trim()) e.billingAddress = 'Billing address is required'
  if (!form.items?.length) e.items = 'At least one line item'
  form.items.forEach((it, idx) => {
    if (!it.name?.trim()) e[`item_${idx}_name`] = 'Item name required'
  })
  return e
}

export function derivePaymentStatus(total, paidVal, explicit, due) {
  if (explicit === 'Paid') return 'Paid'
  if (paidVal >= total && total > 0) return 'Paid'
  try {
    if (due && explicit !== 'Paid' && new Date() > parseISO(due)) return 'Overdue'
  } catch {
    /* ignore */
  }
  return explicit === 'Overdue' ? 'Overdue' : 'Pending'
}

export function buildInvoicePayload(form) {
  const items = form.items.map((it) => ({
    ...it,
    quantity: Number(it.quantity) || 0,
    price: Number(it.price) || 0,
    taxPercent: Number(it.taxPercent) || 0,
  }))
  const total = calcInvoiceTotals(items)
  const paidVal = Number(form.paidAmount) || 0
  const dueAmount = Math.max(0, total - paidVal)
  const paymentStatus = derivePaymentStatus(total, paidVal, form.paymentStatus, form.dueDate)

  return {
    ...form,
    invoiceId: form.invoiceId?.trim() || useAppStore.getState().consumeNextDisplayCode('invoice'),
    items,
    totalAmount: total,
    paidAmount: paidVal,
    dueAmount,
    paymentStatus,
  }
}

export function cloneForm(obj) {
  return JSON.parse(JSON.stringify(obj))
}
