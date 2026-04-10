import { nanoid } from 'nanoid'
import { useAppStore } from '../../store/useAppStore'
import { calcQuoteTotals } from '../../utils/quoteCalculations'

export function emptyItem() {
  return { name: '', quantity: 1, price: 0, taxPercent: 0 }
}

export function emptyQuotation() {
  return {
    quoteId: '',
    clientId: '',
    enquiryId: '',
    items: [emptyItem()],
    discount: 0,
    status: 'Draft',
  }
}

export function mapQuotationToForm(q) {
  return {
    quoteId: q.quoteId ?? '',
    clientId: q.clientId ?? '',
    enquiryId: q.enquiryId ?? '',
    items: q.items?.length ? JSON.parse(JSON.stringify(q.items)) : [emptyItem()],
    discount: q.discount ?? 0,
    status: q.status ?? 'Draft',
  }
}

export function validateQuotation(form) {
  const e = {}
  if (!form.clientId) e.clientId = 'Client is required'
  if (!form.items?.length) e.items = 'At least one line item'
  form.items.forEach((it, idx) => {
    if (!it.name?.trim()) e[`item_${idx}_name`] = 'Item name required'
  })
  return e
}

export function buildQuotationPayload(form) {
  const { subtotal, taxTotal, total, finalAmount } = calcQuoteTotals(form.items, form.discount)
  return {
    ...form,
    quoteId: form.quoteId?.trim() || useAppStore.getState().consumeNextDisplayCode('quotation'),
    discount: Number(form.discount) || 0,
    items: form.items.map((it) => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      price: Number(it.price) || 0,
      taxPercent: Number(it.taxPercent) || 0,
    })),
    subtotal,
    taxTotal,
    total,
    finalAmount,
  }
}

export function cloneForm(obj) {
  return JSON.parse(JSON.stringify(obj))
}
