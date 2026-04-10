import { isAfter, parseISO, startOfMonth, format } from 'date-fns'

/**
 * Revenue rule: sum of paidAmount on invoices where paymentStatus === 'Paid'.
 * Falls back to 0 when no paid invoices. (Documented for dashboard KPI consistency.)
 */
export function computeRevenue(invoices) {
  if (!Array.isArray(invoices)) return 0
  return invoices.reduce((sum, inv) => {
    if (inv.paymentStatus === 'Paid') {
      return sum + (Number(inv.paidAmount) || 0)
    }
    return sum
  }, 0)
}

export function enquiryStatusCounts(enquiries) {
  const map = { New: 0, 'In Progress': 0, Quoted: 0, Closed: 0 }
  for (const e of enquiries || []) {
    if (map[e.status] !== undefined) map[e.status] += 1
  }
  return map
}

/** Last 6 months labels + revenue per month from paid invoices (by createdAt month). */
export function revenueTrend(invoices) {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: format(d, 'yyyy-MM'),
      label: format(d, 'MMM'),
      value: 0,
    })
  }
  for (const inv of invoices || []) {
    if (inv.paymentStatus !== 'Paid') continue
    const t = inv.createdAt ? parseISO(inv.createdAt) : null
    if (!t || Number.isNaN(t.getTime())) continue
    const key = format(startOfMonth(t), 'yyyy-MM')
    const bucket = months.find((m) => m.key === key)
    if (bucket) bucket.value += Number(inv.paidAmount) || 0
  }
  return months.map(({ label, value }) => ({ name: label, revenue: value }))
}

export function isInvoiceOverdue(inv) {
  if (!inv?.dueDate || inv.paymentStatus === 'Paid') return false
  try {
    return isAfter(new Date(), parseISO(inv.dueDate))
  } catch {
    return false
  }
}
