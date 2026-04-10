import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  differenceInCalendarDays,
} from 'date-fns'

export const REPORT_PRESETS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'last_12', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
]

export function parseEntityDate(raw) {
  if (!raw) return null
  try {
    const t = typeof raw === 'string' ? parseISO(raw) : new Date(raw)
    return isValid(t) ? t : null
  } catch {
    return null
  }
}

/**
 * @param {{ from: Date | null, to: Date | null }} range
 */
export function entityInDateRange(entity, range, getDate = (e) => e.createdAt) {
  const t = parseEntityDate(getDate(entity))
  if (!t) return !range.from && !range.to
  if (!range.from && !range.to) return true
  const start = range.from ? startOfDay(range.from) : new Date(0)
  const end = range.to ? endOfDay(range.to) : new Date(8.64e15)
  return t >= start && t <= end
}

export function filterByRange(list, range, getDate) {
  return (list || []).filter((x) => entityInDateRange(x, range, getDate))
}

export function getRangeFromPreset(preset) {
  const now = new Date()
  switch (preset) {
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'last_month': {
      const ref = subMonths(now, 1)
      return { from: startOfMonth(ref), to: endOfMonth(ref) }
    }
    case 'this_quarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) }
    case 'ytd':
      return { from: startOfYear(now), to: endOfDay(now) }
    case 'last_12':
      return { from: startOfMonth(subMonths(now, 11)), to: endOfDay(now) }
    case 'all':
    default:
      return { from: null, to: null }
  }
}

export function rangeFromInputs(fromStr, toStr) {
  if (!fromStr && !toStr) return { from: null, to: null }
  const from = fromStr ? parseISO(fromStr) : null
  const to = toStr ? parseISO(toStr) : null
  return {
    from: from && isValid(from) ? from : null,
    to: to && isValid(to) ? to : null,
  }
}

export function formatRangeSubtitle(range) {
  if (!range.from && !range.to) return 'All recorded activity'
  const a = range.from ? format(range.from, 'MMM d, yyyy') : '…'
  const b = range.to ? format(range.to, 'MMM d, yyyy') : '…'
  return `${a} — ${b}`
}

function countBy(list, keyFn) {
  const m = new Map()
  for (const row of list || []) {
    const k = keyFn(row) || '—'
    m.set(k, (m.get(k) || 0) + 1)
  }
  return m
}

function sumBy(list, valFn) {
  let s = 0
  for (const row of list || []) s += Number(valFn(row)) || 0
  return s
}

function normKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Users who can own an enquiry for reporting (sales + admin + boss). */
export function getSalesTeamUsers(users) {
  return (users || [])
    .filter((u) => u && (u.role === 'sales' || u.role === 'admin' || u.role === 'boss'))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
}

/**
 * Resolve CRM user id for enquiry ownership: explicit assignedSalesUserId, else match name/email text fields.
 * @param {object} enquiry
 * @param {object[]} salesTeamUsers from getSalesTeamUsers
 */
export function resolveEnquirySalesUserId(enquiry, salesTeamUsers) {
  const team = salesTeamUsers || []
  const allowed = new Set(team.map((u) => u.id))
  const setId = enquiry?.assignedSalesUserId
  if (setId && allowed.has(setId)) return setId

  const textFields = [enquiry?.salesPersonAssigned, enquiry?.assignedTo].map(normKey).filter(Boolean)
  for (const u of team) {
    if (textFields.includes(normKey(u.id))) return u.id
    const email = normKey(u.email)
    const name = normKey(u.name)
    for (const t of textFields) {
      if (email && t === email) return u.id
      if (name && t === name) return u.id
    }
  }
  return null
}

/**
 * Apply date range, then optionally restrict to one sales owner (enquiry → quote → invoice chain).
 */
export function deriveSalesFilteredEntities(clients, enquiries, quotations, invoices, range, salesUserId, salesTeamUsers) {
  const team = salesTeamUsers || []
  let ce = filterByRange(enquiries, range, (e) => e.createdAt)
  let cq = filterByRange(quotations, range, (q) => q.createdAt)
  let ci = filterByRange(invoices, range, (i) => i.createdAt)
  let cc = filterByRange(clients, range, (c) => c.createdAt)

  if (!salesUserId) return { ce, cq, ci, cc }

  ce = ce.filter((e) => resolveEnquirySalesUserId(e, team) === salesUserId)
  const enquiryIds = new Set(ce.map((e) => e.id))
  cq = cq.filter((q) => q.enquiryId && enquiryIds.has(q.enquiryId))
  const quoteIds = new Set(cq.map((q) => q.id))
  ci = ci.filter((i) => i.quoteId && quoteIds.has(i.quoteId))
  const clientIds = new Set(ce.map((e) => e.clientId).filter(Boolean))
  cc = cc.filter((c) => clientIds.has(c.id))
  return { ce, cq, ci, cc }
}

/** Invoices linked to a sales user via enquiry → quotation chain (ignores date range on chain). */
export function filterInvoicesForSalesUserLedger(invoices, quotations, enquiries, salesUserId, salesTeamUsers) {
  if (!salesUserId) return invoices || []
  const team = salesTeamUsers || []
  const ce = (enquiries || []).filter((e) => resolveEnquirySalesUserId(e, team) === salesUserId)
  const enquiryIds = new Set(ce.map((e) => e.id))
  const cq = (quotations || []).filter((q) => q.enquiryId && enquiryIds.has(q.enquiryId))
  const quoteIds = new Set(cq.map((q) => q.id))
  return (invoices || []).filter((i) => i.quoteId && quoteIds.has(i.quoteId))
}

export function salesTeamLeaderboard(clients, enquiries, quotations, invoices, range, salesTeamUsers) {
  const team = getSalesTeamUsers(salesTeamUsers)
  const rows = team.map((u) => {
    const { ce, cq, ci, cc } = deriveSalesFilteredEntities(clients, enquiries, quotations, invoices, range, u.id, team)
    const pipelineValue = sumBy(
      ce.filter((e) => e.status && e.status !== 'Closed'),
      (e) => e.targetBudget ?? e.expectedValue ?? 0,
    )
    const quotedValue = sumBy(
      cq.filter((q) => q.status && q.status !== 'Draft' && q.status !== 'Rejected'),
      (q) => q.finalAmount ?? 0,
    )
    const wonQuoteValue = sumBy(cq.filter((q) => q.status === 'Accepted'), (q) => q.finalAmount ?? 0)
    const collected = sumBy(ci.filter((i) => i.paymentStatus === 'Paid'), (i) => i.paidAmount ?? 0)
    const distinctClients = new Set(ce.map((e) => e.clientId).filter(Boolean)).size
    const quotedEnquiries = new Set(cq.map((q) => q.enquiryId).filter(Boolean)).size
    const conversionRate = ce.length ? Math.round((quotedEnquiries / ce.length) * 1000) / 10 : 0
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      enquiries: ce.length,
      quotations: cq.length,
      invoices: ci.length,
      clientsInPeriod: cc.length,
      distinctClientsWithEnquiries: distinctClients,
      pipelineValue,
      quotedValue,
      wonQuoteValue,
      collectedRevenue: collected,
      conversionRate,
    }
  })
  return rows.sort((a, b) => b.collectedRevenue - a.collectedRevenue || b.enquiries - a.enquiries)
}

export function executiveKpis({ clients, enquiries, quotations, invoices, range, salesUserId, salesTeamUsers }) {
  const { ce, cq, ci, cc } = deriveSalesFilteredEntities(
    clients,
    enquiries,
    quotations,
    invoices,
    range,
    salesUserId || null,
    salesTeamUsers || [],
  )

  const pipelineValue = sumBy(
    ce.filter((e) => e.status && e.status !== 'Closed'),
    (e) => e.targetBudget ?? e.expectedValue ?? 0,
  )
  const quotedValue = sumBy(
    cq.filter((q) => q.status && q.status !== 'Draft' && q.status !== 'Rejected'),
    (q) => q.finalAmount ?? 0,
  )
  const wonQuoteValue = sumBy(cq.filter((q) => q.status === 'Accepted'), (q) => q.finalAmount ?? 0)

  const billed = sumBy(ci, (i) => i.totalAmount ?? 0)
  const collected = sumBy(ci.filter((i) => i.paymentStatus === 'Paid'), (i) => i.paidAmount ?? 0)
  const ledgerInv = salesUserId
    ? filterInvoicesForSalesUserLedger(invoices, quotations, enquiries, salesUserId, salesTeamUsers || [])
    : invoices || []
  const outstanding = sumBy(ledgerInv.filter((i) => i.paymentStatus !== 'Paid'), (i) =>
    Number(i.dueAmount ?? Math.max(0, (i.totalAmount || 0) - (i.paidAmount || 0))) || 0,
  )

  const quotedEnquiries = new Set(cq.map((q) => q.enquiryId).filter(Boolean)).size
  const conversionRate = ce.length ? Math.round((quotedEnquiries / ce.length) * 1000) / 10 : 0

  return {
    newClients: cc.length,
    enquiries: ce.length,
    quotations: cq.length,
    invoices: ci.length,
    pipelineValue,
    quotedValue,
    wonQuoteValue,
    billed,
    collected,
    outstanding,
    quotedEnquiries,
    conversionRate,
  }
}

export function enquiriesByField(enquiries, field) {
  const m = countBy(enquiries, (e) => e[field])
  return [...m.entries()].map(([name, count]) => ({ name: String(name), count })).sort((a, b) => b.count - a.count)
}

export function quotationsByStatus(quotations) {
  const m = countBy(quotations, (q) => q.status || 'Draft')
  const order = ['Draft', 'Sent', 'Accepted', 'Rejected']
  return order.filter((s) => m.has(s)).map((name) => ({ name, count: m.get(name), value: sumBy(quotations.filter((q) => q.status === name), (q) => q.finalAmount ?? 0) }))
}

export function invoicesByPaymentStatus(invoices) {
  const m = countBy(invoices, (i) => i.paymentStatus || 'Pending')
  return [...m.entries()].map(([name, count]) => ({
    name,
    count,
    amount: sumBy(
      invoices.filter((i) => (i.paymentStatus || 'Pending') === name),
      (i) => i.totalAmount ?? 0,
    ),
  }))
}

export function monthlyTrend(enquiries, quotations, invoices, range, maxPoints = 14) {
  const end = range.to ? endOfDay(range.to) : endOfDay(new Date())
  let start = range.from ? startOfMonth(range.from) : startOfMonth(subMonths(end, maxPoints - 1))
  if (start > end) start = startOfMonth(end)

  const points = []
  let cursor = start
  while (cursor <= end && points.length < maxPoints) {
    const key = format(cursor, 'yyyy-MM')
    points.push({
      key,
      label: format(cursor, 'MMM yy'),
      enquiries: 0,
      quotations: 0,
      revenue: 0,
    })
    cursor = addMonths(cursor, 1)
  }
  if (!points.length) {
    const key = format(end, 'yyyy-MM')
    points.push({ key, label: format(end, 'MMM yy'), enquiries: 0, quotations: 0, revenue: 0 })
  }

  const inMonth = (t, key) => t && format(t, 'yyyy-MM') === key

  for (const e of enquiries || []) {
    const t = parseEntityDate(e.createdAt)
    const p = points.find((x) => inMonth(t, x.key))
    if (p) p.enquiries += 1
  }
  for (const q of quotations || []) {
    const t = parseEntityDate(q.createdAt)
    const p = points.find((x) => inMonth(t, x.key))
    if (p) p.quotations += 1
  }
  for (const inv of invoices || []) {
    if (inv.paymentStatus !== 'Paid') continue
    const t = parseEntityDate(inv.createdAt)
    const p = points.find((x) => inMonth(t, x.key))
    if (p) p.revenue += Number(inv.paidAmount) || 0
  }

  return points
}

/** Invoices should already be scoped (e.g. date range + sales filter). */
export function topClientsByPaidRevenue(invoices, clients, limit = 10) {
  const paid = (invoices || []).filter((i) => i.paymentStatus === 'Paid')
  const byClient = new Map()
  for (const inv of paid) {
    const id = inv.clientId
    if (!id) continue
    byClient.set(id, (byClient.get(id) || 0) + (Number(inv.paidAmount) || 0))
  }
  const rows = [...byClient.entries()]
    .map(([clientId, revenue]) => {
      const c = (clients || []).find((x) => x.id === clientId)
      const name = c ? c.companyName || c.clientName || clientId : clientId
      return { clientId, name, revenue }
    })
    .sort((a, b) => b.revenue - a.revenue)
  return rows.slice(0, limit)
}

export function topClientsByRevenue(invoices, clients, range, limit = 10) {
  const ci = filterByRange(invoices, range, (i) => i.createdAt)
  return topClientsByPaidRevenue(ci, clients, limit)
}

export function overdueInvoicesSummary(invoices) {
  const now = new Date()
  const open = (invoices || []).filter((i) => i.paymentStatus !== 'Paid')
  let overdueCount = 0
  let overdueAmount = 0
  for (const inv of open) {
    const due = inv.dueDate ? parseEntityDate(inv.dueDate) : null
    const dueAmt = Number(inv.dueAmount ?? Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0))) || 0
    if (due && due < now) {
      overdueCount += 1
      overdueAmount += dueAmt
    }
  }
  return { overdueCount, overdueAmount, openCount: open.length }
}

export function arAgingBuckets(invoices) {
  const now = startOfDay(new Date())
  const buckets = [
    { name: 'Current (not due)', key: 'cur' },
    { name: '1–30 days past due', key: 'd30' },
    { name: '31–60 days past due', key: 'd60' },
    { name: '61–90 days past due', key: 'd90' },
    { name: '90+ days past due', key: 'd90p' },
  ].map((b) => ({ ...b, amount: 0, count: 0 }))

  for (const inv of invoices || []) {
    if (inv.paymentStatus === 'Paid') continue
    const due = inv.dueDate ? parseEntityDate(inv.dueDate) : null
    const amt = Number(inv.dueAmount ?? Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0))) || 0
    if (amt <= 0) continue
    const dueDay = due ? startOfDay(due) : null
    const daysPastDue = dueDay ? differenceInCalendarDays(now, dueDay) : null
    let b = buckets[0]
    if (daysPastDue == null) b = buckets[0]
    else if (daysPastDue <= 0) b = buckets[0]
    else if (daysPastDue <= 30) b = buckets[1]
    else if (daysPastDue <= 60) b = buckets[2]
    else if (daysPastDue <= 90) b = buckets[3]
    else b = buckets[4]
    b.amount += amt
    b.count += 1
  }

  return buckets.map(({ name, amount, count }) => ({ name, amount, count }))
}

function summarizeLagDays(values) {
  const arr = (values || []).filter((n) => Number.isFinite(n) && n >= 0)
  if (!arr.length) return { n: 0, median: null, mean: null }
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  const mean = s.reduce((a, b) => a + b, 0) / s.length
  return { n: s.length, median: Math.round(median * 10) / 10, mean: Math.round(mean * 10) / 10 }
}

/** Distinct enquiries in scope that have at least one linked quotation in scope. */
export function pipelineFunnelCounts(enquiries, quotations, invoices) {
  const eids = new Set((enquiries || []).map((e) => e.id))
  const qs = (quotations || []).filter((q) => !q.enquiryId || eids.has(q.enquiryId))
  const qids = new Set(qs.map((q) => q.id))
  const invs = (invoices || []).filter((i) => !i.quoteId || qids.has(i.quoteId))
  const enqQuoted = new Set(qs.map((q) => q.enquiryId).filter(Boolean))
  return {
    enquiries: (enquiries || []).length,
    enquiriesWithQuote: enqQuoted.size,
    quotations: qs.length,
    quotationsAccepted: qs.filter((q) => q.status === 'Accepted').length,
    quotationsRejected: qs.filter((q) => q.status === 'Rejected').length,
    invoices: invs.length,
  }
}

export function quoteOutcomeTable(quotations) {
  const qs = quotations || []
  const rows = [
    {
      name: 'Accepted',
      count: qs.filter((q) => q.status === 'Accepted').length,
      value: sumBy(qs.filter((q) => q.status === 'Accepted'), (q) => q.finalAmount ?? 0),
    },
    {
      name: 'Rejected',
      count: qs.filter((q) => q.status === 'Rejected').length,
      value: sumBy(qs.filter((q) => q.status === 'Rejected'), (q) => q.finalAmount ?? 0),
    },
    {
      name: 'Sent (pending)',
      count: qs.filter((q) => q.status === 'Sent').length,
      value: sumBy(qs.filter((q) => q.status === 'Sent'), (q) => q.finalAmount ?? 0),
    },
    {
      name: 'Draft',
      count: qs.filter((q) => !q.status || q.status === 'Draft').length,
      value: sumBy(qs.filter((q) => !q.status || q.status === 'Draft'), (q) => q.finalAmount ?? 0),
    },
  ]
  return rows
}

export function cycleTimeStats(enquiries, quotations, invoices) {
  const byEnq = new Map((enquiries || []).map((e) => [e.id, e]))
  const lagsEq = []
  for (const q of quotations || []) {
    const e = byEnq.get(q.enquiryId)
    if (!e) continue
    const d0 = parseEntityDate(e.createdAt)
    const d1 = parseEntityDate(q.createdAt)
    if (d0 && d1) lagsEq.push(differenceInCalendarDays(d1, d0))
  }
  const byQuote = new Map((quotations || []).map((q) => [q.id, q]))
  const lagsQi = []
  for (const inv of invoices || []) {
    const q = byQuote.get(inv.quoteId)
    if (!q) continue
    const d0 = parseEntityDate(q.createdAt)
    const d1 = parseEntityDate(inv.createdAt)
    if (d0 && d1) lagsQi.push(differenceInCalendarDays(d1, d0))
  }
  return {
    enquiryToQuoteDays: summarizeLagDays(lagsEq),
    quoteToInvoiceDays: summarizeLagDays(lagsQi),
  }
}

/** Count pricing-user appearances on enquiries (enquiry-level + line-level, deduped per enquiry). */
export function pricingUserWorkload(enquiries) {
  const m = new Map()
  for (const e of enquiries || []) {
    const seen = new Set()
    const bump = (id) => {
      if (!id || seen.has(id)) return
      seen.add(id)
      m.set(id, (m.get(id) || 0) + 1)
    }
    for (const id of e.assignedPricingUserIds || []) bump(id)
    for (const li of e.lineItems || []) {
      for (const id of li.assignedPricingUserIds || []) bump(id)
    }
  }
  return [...m.entries()]
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
}

export function topFieldCounts(enquiries, field, limit = 12) {
  const m = countBy(enquiries || [], (e) => {
    const v = e[field]
    return v != null && String(v).trim() !== '' ? String(v).trim() : '—'
  })
  return [...m.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Per month: total invoiced (all invoices) vs paid amount (paid invoices only).
 */
export function monthlyBilledVsPaid(invoices, range, maxPoints = 14) {
  const end = range.to ? endOfDay(range.to) : endOfDay(new Date())
  let start = range.from ? startOfMonth(range.from) : startOfMonth(subMonths(end, maxPoints - 1))
  if (start > end) start = startOfMonth(end)

  const points = []
  let cursor = start
  while (cursor <= end && points.length < maxPoints) {
    const key = format(cursor, 'yyyy-MM')
    points.push({
      key,
      label: format(cursor, 'MMM yy'),
      billed: 0,
      paid: 0,
    })
    cursor = addMonths(cursor, 1)
  }
  if (!points.length) {
    const key = format(end, 'yyyy-MM')
    points.push({ key, label: format(end, 'MMM yy'), billed: 0, paid: 0 })
  }

  const inMonth = (t, monthKey) => t && format(t, 'yyyy-MM') === monthKey

  for (const inv of invoices || []) {
    const t = parseEntityDate(inv.createdAt)
    const p = points.find((x) => inMonth(t, x.key))
    if (!p) continue
    p.billed += Number(inv.totalAmount) || 0
    if (inv.paymentStatus === 'Paid') p.paid += Number(inv.paidAmount) || 0
  }

  return points
}

export function invoicesByPaymentMethod(invoices) {
  return [...countBy(invoices || [], (i) => i.paymentMethod || '—').entries()]
    .map(([name, count]) => ({
      name: String(name),
      count,
      amount: sumBy(
        (invoices || []).filter((i) => (i.paymentMethod || '—') === name),
        (i) => i.totalAmount ?? 0,
      ),
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function escapeCsvCell(v) {
  const s = String(v ?? '')
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(columns, rows) {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(',')
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.access(row))).join(','))
  return [header, ...lines].join('\r\n')
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}
