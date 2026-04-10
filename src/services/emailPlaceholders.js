import { format } from 'date-fns'
import { isExternalFacingCategory } from './emailTemplateCategories'
import { calcLineTax, calcQuoteTotals } from '../utils/quoteCalculations'

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function table(rows) {
  if (!rows.length) return '<p><em>No rows.</em></p>'
  const head = Object.keys(rows[0])
  const th = head.map((h) => `<th style="text-align:left;padding:6px 10px;border-bottom:1px solid #e2e8f0">${esc(h)}</th>`).join('')
  const body = rows
    .map(
      (r) =>
        `<tr>${head.map((h) => `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">${esc(r[h])}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<table style="border-collapse:collapse;width:100%;max-width:640px;font-size:14px;color:#0f172a">${`<thead><tr>${th}</tr></thead>`}<tbody>${body}</tbody></table>`
}

function fmtMoney(n, currency = 'USD') {
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(num)
  } catch {
    return `${currency || 'USD'} ${num.toFixed(2)}`
  }
}

function sectionTitle(text) {
  return `<h3 style="margin:20px 0 10px;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #e2e8f0;padding-bottom:6px">${esc(text)}</h3>`
}

function buildClientDetailsHtml(client, enquiry) {
  const company =
    client?.companyName ||
    client?.clientName ||
    enquiry?.customerCompanyName ||
    ''
  const contact =
    client?.contactPersonName ||
    enquiry?.contactPerson ||
    client?.clientName ||
    ''
  const email =
    client?.contactPersonEmail ||
    client?.email ||
    enquiry?.contactEmail ||
    ''
  const phone = client?.phone || enquiry?.contactPhone || ''
  const parts = [
    company && `<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a">${esc(company)}</p>`,
    contact && `<p style="margin:0;font-size:14px;color:#334155"><strong>Contact:</strong> ${esc(contact)}</p>`,
    email && `<p style="margin:4px 0 0;font-size:14px;color:#334155"><strong>Email:</strong> <a href="mailto:${esc(email)}" style="color:#2563eb">${esc(email)}</a></p>`,
    phone && `<p style="margin:4px 0 0;font-size:14px;color:#334155"><strong>Phone:</strong> ${esc(phone)}</p>`,
  ].filter(Boolean)
  const addr = [client?.address, [client?.city, client?.state, client?.country].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ')
  if (addr) {
    parts.push(`<p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.4">${esc(addr)}</p>`)
  }
  if (!parts.length) return ''
  return `${sectionTitle('Client details')}<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px">${parts.join('')}</div>`
}

function buildEnquiryLineItemsHtml(enquiry) {
  const lines = enquiry?.lineItems || []
  if (!lines.length) return ''
  const rows = lines.map((li, i) => {
    const qty = Number(li.quantity) || 0
    const desc = String(li.description || '').trim() || `Line ${i + 1}`
    return {
      '#': String(i + 1),
      Description: desc,
      Qty: String(qty),
    }
  })
  return `${sectionTitle('Pricing line items')}${table(rows)}`
}

function buildEnquirySummaryHtml(enquiry) {
  const rows = [
    { Field: 'Enquiry ID', Value: enquiry?.enquiryId || enquiry?.id || '—' },
    { Field: 'Status', Value: enquiry?.status || '—' },
    { Field: 'Service / mode', Value: [enquiry?.serviceType, enquiry?.modeType].filter(Boolean).join(' · ') || '—' },
    { Field: 'Shipment', Value: enquiry?.shipmentType || '—' },
    { Field: 'Incoterms', Value: enquiry?.incoterms || '—' },
    { Field: 'Priority', Value: enquiry?.priority || '—' },
    {
      Field: 'Route',
      Value: [
        [enquiry?.originCity, enquiry?.originCountry].filter(Boolean).join(', ') || '—',
        '→',
        [enquiry?.destCity, enquiry?.destCountry].filter(Boolean).join(', ') || '—',
      ].join(' '),
    },
    { Field: 'Pickup / delivery', Value: [enquiry?.pickupType, enquiry?.deliveryType].filter(Boolean).join(' / ') || '—' },
    { Field: 'Commodity', Value: enquiry?.commodityDescription || enquiry?.description || '—' },
    { Field: 'HS code', Value: enquiry?.hsCode || '—' },
    { Field: 'Weight / volume', Value: [enquiry?.grossWeightKg && `${enquiry.grossWeightKg} kg`, enquiry?.volumeCbm && `${enquiry.volumeCbm} CBM`].filter(Boolean).join(' · ') || '—' },
    { Field: 'Target budget', Value: enquiry?.targetBudget != null ? fmtMoney(enquiry.targetBudget, enquiry?.currency) : '—' },
    { Field: 'Ready / pickup / delivery', Value: [enquiry?.readyDate, enquiry?.pickupDate, enquiry?.expectedDeliveryDate].filter(Boolean).join(' · ') || '—' },
  ]
  return `${sectionTitle('Enquiry summary')}${table(rows)}`
}

function buildQuotationLineItemsDetailedHtml(quotation, currency) {
  const items = quotation?.items || []
  if (!items.length) return '<p><em>No line items.</em></p>'
  const rows = items.map((it, i) => {
    const qty = Number(it.quantity) || 0
    const price = Number(it.price) || 0
    const pct = Number(it.taxPercent) || 0
    const lineSub = qty * price
    const taxAmt = calcLineTax(it)
    const lineTot = lineSub + taxAmt
    return {
      '#': String(i + 1),
      Item: String(it.name || '').trim() || `Item ${i + 1}`,
      Qty: String(qty),
      'Unit price': fmtMoney(price, currency),
      'Tax %': `${pct}%`,
      'Tax amt': fmtMoney(taxAmt, currency),
      'Line total': fmtMoney(lineTot, currency),
    }
  })
  return `${sectionTitle('Quoted items')}${table(rows)}`
}

function buildQuotationTotalsHtml(quotation, currency) {
  const items = quotation?.items || []
  const discount = Number(quotation?.discount) || 0
  const { subtotal, taxTotal, total, finalAmount } = calcQuoteTotals(items, discount)
  const sub = fmtMoney(subtotal, currency)
  const tax = fmtMoney(taxTotal, currency)
  const disc = fmtMoney(discount, currency)
  const tot = fmtMoney(total, currency)
  const fin = fmtMoney(finalAmount, currency)
  const rows = [
    `<tr><td style="padding:6px 0;color:#475569">Subtotal (excl. discount)</td><td style="padding:6px 0;text-align:right;font-weight:600">${sub}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#475569">Tax</td><td style="padding:6px 0;text-align:right;font-weight:600">${tax}</td></tr>`,
  ]
  if (discount > 0) {
    rows.push(
      `<tr><td style="padding:6px 0;color:#475569">Discount</td><td style="padding:6px 0;text-align:right;font-weight:600">−${disc}</td></tr>`,
    )
  }
  rows.push(
    `<tr><td style="padding:10px 0 6px;border-top:2px solid #0f172a;font-size:16px;font-weight:800;color:#0f172a">Total due</td><td style="padding:10px 0 6px;border-top:2px solid #0f172a;text-align:right;font-size:16px;font-weight:800;color:#0f172a">${fin}</td></tr>`,
    `<tr><td colspan="2" style="padding:4px 0 0;font-size:12px;color:#64748b">Subtotal + tax before discount: ${tot}</td></tr>`,
  )
  return `${sectionTitle('Totals')}<table style="border-collapse:collapse;width:100%;max-width:400px;font-size:14px">${rows.join('')}</table><p style="margin:8px 0 0;font-size:12px;color:#64748b">Currency: <strong>${esc(currency)}</strong> · Current status: <strong>${esc(quotation?.status || '—')}</strong></p>`
}

function buildQuotationClientActionsHtml({ quotationId, token, respondBaseUrl, includeClientActions }) {
  if (!includeClientActions) {
    return '<p style="font-size:12px;color:#94a3b8"><em>Internal copy — client accept/decline actions omitted.</em></p>'
  }
  const base = String(respondBaseUrl || '').replace(/\/$/, '')
  if (!base || !quotationId || !token) {
    return `<p style="font-size:13px;color:#64748b">Please reply to this email or contact us to confirm this quotation.</p>`
  }
  const enc = encodeURIComponent(token)
  const accept = `${base}/api/public/quotations/${quotationId}/respond?action=accept&token=${enc}`
  const reject = `${base}/api/public/quotations/${quotationId}/respond?action=reject&token=${enc}`
  const btn = (href, label, bg) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 22px;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:2px">${esc(label)}</a>`
  return `${sectionTitle('Your decision')}
<p style="font-size:14px;color:#334155;margin-bottom:12px">Click one of the buttons below to record your response. This page must be opened in the same environment where your supplier manages quotations (e.g. their CRM link).</p>
<div style="margin:16px 0">${btn(accept, 'Accept quotation', '#059669')}${btn(reject, 'Decline quotation', '#b91c1c')}</div>
<p style="font-size:11px;color:#94a3b8">If the buttons do not work, forward this email to your contact or ask them to update the status manually.</p>`
}

/**
 * Replace {{key}} in template string. Unknown keys become empty.
 */
export function interpolateTemplate(str, ctx) {
  if (!str) return ''
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = ctx[key]
    return v == null ? '' : String(v)
  })
}

export function wrapExternalEmailHtml(innerHtml, branding) {
  const b = branding || {}
  const accent = b.accentColor || '#2563eb'
  const maxW = Math.min(320, Math.max(80, Number(b.logoMaxWidthPx) || 160))
  const logoBlock =
    b.logoUrl && String(b.logoUrl).trim()
      ? `<div style="text-align:center;margin-bottom:20px"><img src="${esc(b.logoUrl)}" alt="${esc(b.logoAlt || 'Logo')}" style="max-width:${maxW}px;height:auto;display:inline-block" /></div>`
      : ''
  const company = b.companyName ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b">${esc(b.companyName)}</p>` : ''
  const tagline = b.headerTagline ? `<p style="margin:0 0 16px;font-size:12px;color:#94a3b8">${esc(b.headerTagline)}</p>` : ''
  const footer = b.footerNote ? `<p style="margin-top:24px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px">${esc(b.footerNote)}</p>` : ''

  return `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;padding:28px 24px">
    <div style="height:3px;background:${esc(accent)};margin:-28px -24px 20px -24px"></div>
    ${logoBlock}
    ${company}
    ${tagline}
    <div style="font-size:15px">${innerHtml}</div>
    ${footer}
  </div>
</div>`
}

export function buildFinalEmailHtml({ category, bodyAfterInterpolation, branding }) {
  const inner = bodyAfterInterpolation
  if (isExternalFacingCategory(category)) {
    return wrapExternalEmailHtml(inner, branding)
  }
  return `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;font-size:14px">${inner}</div>`
}

export function buildClientEmailContext({ client, sender }) {
  const s = sender || {}
  return {
    recipientName: client?.contactPersonName || client?.clientName || 'there',
    body: '',
    senderName: s.name || '',
    senderEmail: s.email || '',
    senderCompany: s.company || 'Our team',
    clientCompanyName: client?.companyName || client?.clientName || '',
    clientContactName: client?.contactPersonName || client?.clientName || '',
    subjectLine: 'Update',
  }
}

export function buildEnquiryEmailContext({ enquiry, client, sender }) {
  const s = sender || {}
  const lines = (enquiry?.lineItems || []).map((li) => ({
    Description: li.description,
    Qty: li.quantity,
  }))
  const enquiryDetailsTable = table([
    { Field: 'Enquiry ID', Value: enquiry?.enquiryId || enquiry?.id || '' },
    { Field: 'Status', Value: enquiry?.status || '' },
    { Field: 'Service / mode', Value: [enquiry?.serviceType, enquiry?.modeType].filter(Boolean).join(' · ') || '' },
    { Field: 'Shipment', Value: enquiry?.shipmentType || '' },
    { Field: 'Incoterms', Value: enquiry?.incoterms || '' },
    { Field: 'Priority', Value: enquiry?.priority || '' },
    {
      Field: 'Route',
      Value: `${[enquiry?.originCity, enquiry?.originCountry].filter(Boolean).join(', ') || '—'} → ${[enquiry?.destCity, enquiry?.destCountry].filter(Boolean).join(', ') || '—'}`,
    },
    { Field: 'Commodity', Value: enquiry?.commodityDescription || enquiry?.description || '' },
    { Field: 'HS code', Value: enquiry?.hsCode || '' },
    {
      Field: 'Weight / volume',
      Value: [enquiry?.grossWeightKg && `${enquiry.grossWeightKg} kg`, enquiry?.volumeCbm && `${enquiry.volumeCbm} CBM`]
        .filter(Boolean)
        .join(' · '),
    },
    ...lines.flatMap((li, i) => [{ Field: `Line ${i + 1}`, Value: `${li.Description} × ${li.Qty}` }]),
  ])
  const clientDetailsBlock = buildClientDetailsHtml(client, enquiry)
  const enquirySummaryBlock = buildEnquirySummaryHtml(enquiry)
  const enquiryLineItemsBlock = buildEnquiryLineItemsHtml(enquiry)
  return {
    enquiryId: enquiry?.enquiryId || enquiry?.id || '',
    commodityDescription: enquiry?.commodityDescription || enquiry?.description || '',
    contactPerson: enquiry?.contactPerson || client?.contactPersonName || client?.clientName || 'there',
    customerCompanyName: enquiry?.customerCompanyName || client?.companyName || '',
    clientDetailsBlock,
    enquirySummaryBlock,
    enquiryLineItemsBlock,
    enquiryDetailsTable,
    enquiryRemarks: enquiry?.enquiryRemarks ? `<p style="margin-top:12px">${esc(enquiry.enquiryRemarks)}</p>` : '',
    senderName: s.name || '',
    senderEmail: s.email || '',
    senderCompany: s.company || '',
    subjectLine: `Enquiry ${enquiry?.enquiryId || ''}`,
  }
}

export function buildQuotationEmailContext({
  quotation,
  client,
  enquiry,
  sender,
  respondBaseUrl = '',
  includeClientActions = true,
}) {
  const s = sender || {}
  const currency = quotation?.currency || 'USD'
  const clientDetailsBlock = buildClientDetailsHtml(client, enquiry)
  const quotationLineItemsBlock = buildQuotationLineItemsDetailedHtml(quotation, currency)
  const quotationTotalsBlock = buildQuotationTotalsHtml(quotation, currency)
  const quotationClientActions = buildQuotationClientActionsHtml({
    quotationId: quotation?.id,
    token: quotation?.clientResponseToken,
    respondBaseUrl,
    includeClientActions,
  })
  const fin = quotation?.finalAmount != null ? Number(quotation.finalAmount) : calcQuoteTotals(quotation?.items || [], quotation?.discount).finalAmount
  return {
    quoteId: quotation?.quoteId || quotation?.id || '',
    finalAmount: Number.isFinite(fin) ? fin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
    currency,
    quoteStatus: quotation?.status || '',
    clientCompanyName: client?.companyName || client?.clientName || '',
    clientContactName: client?.contactPersonName || client?.clientName || enquiry?.contactPerson || 'there',
    clientDetailsBlock,
    quotationLineItemsBlock,
    quotationTotalsBlock,
    quotationClientActions,
    quotationItemsTable: quotationLineItemsBlock,
    quoteNotes: '',
    enquiryId: enquiry?.enquiryId || enquiry?.id || '',
    senderName: s.name || '',
    senderEmail: s.email || '',
    subjectLine: `Quotation ${quotation?.quoteId || ''}`,
  }
}

export function buildInternalEnquiryEmailContext({ enquiry, client, sender }) {
  const base = buildEnquiryEmailContext({ enquiry, client, sender })
  return {
    ...base,
    subjectLine: `Enquiry ${base.enquiryId}`,
    body: `<p><strong>Internal:</strong> enquiry <strong>${esc(base.enquiryId)}</strong> — ${esc(base.commodityDescription)}</p>${base.clientDetailsBlock}${base.enquirySummaryBlock}${base.enquiryLineItemsBlock}`,
  }
}

/** Internal share: invoice summary HTML for {{body}} in internal_email templates. */
export function buildInvoiceShareEmailContext({ invoice, client, sender }) {
  const inv = invoice || {}
  const c = client || {}
  const s = sender || {}
  const currency = inv.currency || 'USD'
  const items = Array.isArray(inv.items) ? inv.items : []
  const summaryRows = [
    { Field: 'Invoice ID', Value: inv.invoiceId || inv.id || '—' },
    { Field: 'Payment status', Value: inv.paymentStatus || '—' },
    { Field: 'Client', Value: c.companyName || c.clientName || '—' },
    { Field: 'Related quote', Value: inv.quoteId || '—' },
    { Field: 'Total', Value: fmtMoney(inv.totalAmount, currency) },
    { Field: 'Paid', Value: fmtMoney(inv.paidAmount, currency) },
    { Field: 'Balance due', Value: fmtMoney(inv.dueAmount, currency) },
    { Field: 'Due date', Value: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '—' },
    { Field: 'Payment method', Value: inv.paymentMethod || '—' },
  ]
  const itemRows = items.map((it, i) => {
    const qty = Number(it.quantity) || 0
    const price = Number(it.price) || 0
    const taxAmt = calcLineTax(it)
    const lineTot = qty * price + taxAmt
    return {
      Item: it.name || `Line ${i + 1}`,
      Qty: String(qty),
      Price: fmtMoney(price, currency),
      Line: fmtMoney(lineTot, currency),
    }
  })
  const addr = inv.billingAddress ? `<p style="margin:12px 0 0;font-size:13px;color:#334155"><strong>Billing address:</strong> ${esc(inv.billingAddress)}</p>` : ''
  const body = `${sectionTitle('Invoice summary')}${table(summaryRows)}${addr}${
    itemRows.length ? sectionTitle('Line items') + table(itemRows) : ''
  }`
  return {
    subjectLine: `Invoice ${inv.invoiceId || inv.id || ''}`,
    body,
    senderName: s.name || '',
    senderEmail: s.email || '',
  }
}

export function buildInternalQuotationEmailContext({ quotation, client, enquiry, sender, respondBaseUrl = '' }) {
  const base = buildQuotationEmailContext({
    quotation,
    client,
    enquiry,
    sender,
    respondBaseUrl,
    includeClientActions: false,
  })
  return {
    ...base,
    subjectLine: `Quotation ${base.quoteId}`,
    body: `<p><strong>Internal:</strong> quotation <strong>${esc(base.quoteId)}</strong> for ${esc(base.clientCompanyName)}</p>${base.clientDetailsBlock}${base.quotationLineItemsBlock}${base.quotationTotalsBlock}`,
  }
}

export function buildInternalReportEmailContext({ kpis, rangeSubtitle, salesFocusLabel, sender }) {
  const base = buildReportEmailContext({ kpis, rangeSubtitle, salesFocusLabel, sender })
  return {
    ...base,
    body: `<p><strong>Internal management summary</strong></p>${base.reportSummaryTable}`,
  }
}

export function buildReportEmailContext({ kpis, rangeSubtitle, salesFocusLabel, sender }) {
  const s = sender || {}
  const reportSummaryTable = table([
    { Metric: 'Period', Value: rangeSubtitle || '' },
    { Metric: 'Sales focus', Value: salesFocusLabel || 'All team' },
    { Metric: 'Enquiries', Value: String(kpis?.enquiries ?? '') },
    { Metric: 'Quotations', Value: String(kpis?.quotations ?? '') },
    { Metric: 'Invoices', Value: String(kpis?.invoices ?? '') },
    { Metric: 'Collected', Value: kpis?.collected != null ? `$${Number(kpis.collected).toFixed(2)}` : '' },
    { Metric: 'Outstanding AR', Value: kpis?.outstanding != null ? `$${Number(kpis.outstanding).toFixed(2)}` : '' },
  ])
  return {
    periodLabel: rangeSubtitle || '',
    reportSummaryTable,
    generatedAt: format(new Date(), 'PPpp'),
    salesFocusLabel: salesFocusLabel || '',
    senderName: s.name || '',
    senderEmail: s.email || '',
    subjectLine: 'Management report',
  }
}
