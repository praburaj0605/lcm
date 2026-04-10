import { format, parseISO } from 'date-fns'
import { Badge } from '../ui/Badge'
import { calcLineTax } from '../../utils/quoteCalculations'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return format(parseISO(String(iso).slice(0, 10)), 'PP')
  } catch {
    try {
      return format(parseISO(iso), 'PPp')
    } catch {
      return String(iso)
    }
  }
}

function fmtMoney(n, currency = 'USD') {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(x)
  } catch {
    return `${currency || 'USD'} ${x.toFixed(2)}`
  }
}

function Section({ title, children }) {
  return (
    <div className="border-t border-slate-200 pt-5 first:border-t-0 first:pt-0 dark:border-slate-700">
      <h3 className="app-detail-section-title mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-va-blue)]">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, value, span }) {
  const show = value != null && String(value).trim() !== ''
  if (!show) return null
  return (
    <div
      className={`rounded-none border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 px-3 py-2.5 shadow-sm dark:border-slate-600 dark:from-slate-800/90 dark:to-slate-900/80 ${span === 'full' ? 'sm:col-span-2' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

function enquiryStatusTone(s) {
  if (s === 'New') return 'yellow'
  if (s === 'In Progress') return 'blue'
  if (s === 'Quoted') return 'violet'
  if (s === 'Closed') return 'green'
  return 'neutral'
}

function quoteStatusTone(s) {
  if (s === 'Accepted') return 'green'
  if (s === 'Rejected') return 'red'
  if (s === 'Sent') return 'blue'
  return 'neutral'
}

function invoicePayTone(s) {
  if (s === 'Paid') return 'green'
  if (s === 'Overdue') return 'red'
  return 'yellow'
}

/** @param {{ client: Record<string, unknown> }} props */
export function ClientDetailView({ client }) {
  const c = client || {}
  return (
    <div className="space-y-1 text-slate-800 dark:text-slate-200">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="blue">{c.status || 'Active'}</Badge>
        {c.industry ? <span className="text-sm text-slate-600 dark:text-slate-400">{String(c.industry)}</span> : null}
      </div>
      <Section title="Company & name">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company" value={c.companyName} />
          <Field label="Client name" value={c.clientName} />
        </div>
      </Section>
      <Section title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" value={c.email} />
          <Field label="Phone" value={c.phone} />
          <Field label="Alternate phone" value={c.alternatePhone} />
          <Field label="Contact person" value={c.contactPersonName} />
          <Field label="Contact role" value={c.contactPersonRole} />
          <Field label="Contact email" value={c.contactPersonEmail} />
        </div>
      </Section>
      <Section title="Address">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Street" value={c.address} span="full" />
          <Field label="City" value={c.city} />
          <Field label="State / region" value={c.state} />
          <Field label="Country" value={c.country} />
          <Field label="Tax / GST ID" value={c.gstTaxId} />
        </div>
      </Section>
      <Section title="Notes">
        <Field label="Internal notes" value={c.notes} span="full" />
      </Section>
      <details className="mt-4 rounded-none border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">Technical reference</summary>
        <p className="mt-2 font-mono text-[11px] break-all">ID: {c.id || '—'}</p>
        {c.createdAt ? <p className="mt-1 font-mono text-[11px]">Created: {String(c.createdAt)}</p> : null}
      </details>
    </div>
  )
}

/** @param {{ enquiry: Record<string, unknown>, clientLabel?: string }} props */
export function EnquiryDetailView({ enquiry, clientLabel }) {
  const e = enquiry || {}
  const lines = Array.isArray(e.lineItems) ? e.lineItems : []
  return (
    <div className="space-y-1 text-slate-800 dark:text-slate-200">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={enquiryStatusTone(e.status)}>{e.status || '—'}</Badge>
        {e.priority ? <Badge tone="neutral">{e.priority}</Badge> : null}
        {e.enquiryId || e.id ? (
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{e.enquiryId || e.id}</span>
        ) : null}
      </div>
      <Section title="Overview">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client" value={clientLabel} />
          <Field label="Service" value={e.serviceType ? String(e.serviceType) : ''} />
          <Field label="Mode" value={e.modeType} />
          <Field label="Shipment" value={e.shipmentType} />
          <Field label="Incoterms" value={e.incoterms} />
          <Field label="Source" value={e.source} />
        </div>
      </Section>
      <Section title="Route">
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800/50">
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {[e.originCity, e.originCountry].filter(Boolean).join(', ') || '—'}
          </span>
          <span className="text-lg text-[var(--color-va-blue)]" aria-hidden>
            →
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {[e.destCity, e.destCountry].filter(Boolean).join(', ') || '—'}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pickup" value={e.pickupType} />
          <Field label="Delivery" value={e.deliveryType} />
        </div>
      </Section>
      <Section title="Cargo & commercial">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Commodity" value={e.commodityDescription || e.description} span="full" />
          <Field label="HS code" value={e.hsCode} />
          <Field label="Weight (kg)" value={e.grossWeightKg != null ? String(e.grossWeightKg) : ''} />
          <Field label="Volume (CBM)" value={e.volumeCbm != null ? String(e.volumeCbm) : ''} />
          <Field label="Container" value={e.containerType} />
          <Field label="Target budget" value={e.targetBudget != null ? fmtMoney(e.targetBudget, e.currency) : ''} />
        </div>
      </Section>
      <Section title="Schedule">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ready date" value={fmtDate(e.readyDate)} />
          <Field label="Pickup date" value={fmtDate(e.pickupDate)} />
          <Field label="Expected delivery" value={fmtDate(e.expectedDeliveryDate)} />
          <Field label="Follow-up" value={fmtDate(e.followUpDate)} />
        </div>
      </Section>
      {lines.length > 0 ? (
        <Section title="Line items">
          <div className="overflow-x-auto rounded-none border border-slate-200 dark:border-slate-600">
            <table className="w-full min-w-[280px] text-left text-sm">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {lines.map((li, i) => (
                  <tr key={li.id || i} className="bg-white dark:bg-slate-900/40">
                    <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{li.description || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{li.quantity ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
      <Section title="Contact on enquiry">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company" value={e.customerCompanyName} />
          <Field label="Contact" value={e.contactPerson} />
          <Field label="Email" value={e.contactEmail} />
          <Field label="Phone" value={e.contactPhone} />
        </div>
      </Section>
      {(e.enquiryRemarks || e.notes) && (
        <Section title="Remarks">
          <Field label="Notes" value={e.enquiryRemarks || e.notes} span="full" />
        </Section>
      )}
      <details className="mt-4 rounded-none border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">Technical reference</summary>
        <p className="mt-2 font-mono text-[11px] break-all">ID: {e.id || '—'}</p>
        {e.clientId ? <p className="mt-1 font-mono text-[11px] break-all">Client ID: {e.clientId}</p> : null}
      </details>
    </div>
  )
}

/** @param {{ quotation: Record<string, unknown>, clientLabel?: string }} props */
export function QuotationDetailView({ quotation, clientLabel }) {
  const q = quotation || {}
  const currency = q.currency || 'USD'
  const items = Array.isArray(q.items) ? q.items : []
  const subtotal = Number(q.subtotal)
  const taxTotal = Number(q.taxTotal)
  const discount = Number(q.discount) || 0
  const finalAmount = Number(q.finalAmount)
  const hasTotals = Number.isFinite(subtotal) && Number.isFinite(finalAmount)

  return (
    <div className="space-y-1 text-slate-800 dark:text-slate-200">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={quoteStatusTone(q.status)}>{q.status || '—'}</Badge>
        <span className="text-lg font-bold text-slate-900 dark:text-white">{q.quoteId || 'Quotation'}</span>
        <span className="text-sm text-slate-500">{currency}</span>
      </div>
      <Section title="Parties">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client" value={clientLabel} />
          <Field label="Linked enquiry" value={q.enquiryId} />
        </div>
      </Section>
      {items.length > 0 ? (
        <Section title="Quoted items">
          <div className="overflow-x-auto rounded-none border border-slate-200 dark:border-slate-600">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                  <th className="px-3 py-2 text-right">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((it, i) => {
                  const qty = Number(it.quantity) || 0
                  const price = Number(it.price) || 0
                  const taxAmt = calcLineTax(it)
                  const lineSub = qty * price
                  const lineTot = lineSub + taxAmt
                  return (
                    <tr key={it.id || i} className="bg-white dark:bg-slate-900/40">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{it.name || `Item ${i + 1}`}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(price, currency)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">
                        {it.taxPercent != null ? `${it.taxPercent}%` : '—'}
                        <span className="block text-[11px]">{fmtMoney(taxAmt, currency)}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtMoney(lineTot, currency)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : (
        <p className="text-sm text-slate-500">No line items.</p>
      )}
      {hasTotals ? (
        <Section title="Totals">
          <div className="max-w-md space-y-2 rounded-none border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-medium tabular-nums">{fmtMoney(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Tax</span>
              <span className="font-medium tabular-nums">{fmtMoney(taxTotal, currency)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex justify-between text-sm text-amber-800 dark:text-amber-200">
                <span>Discount</span>
                <span className="font-medium tabular-nums">−{fmtMoney(discount, currency)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold dark:border-slate-600">
              <span>Total due</span>
              <span className="tabular-nums text-[var(--color-va-blue)]">{fmtMoney(finalAmount, currency)}</span>
            </div>
          </div>
        </Section>
      ) : null}
      {q.clientRespondedAt ? (
        <Section title="Client response">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status" value={q.clientResponseAction || q.status} />
            <Field label="Responded" value={fmtDate(q.clientRespondedAt)} />
          </div>
        </Section>
      ) : null}
      <details className="mt-4 rounded-none border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">Technical reference</summary>
        <p className="mt-2 font-mono text-[11px] break-all">ID: {q.id || '—'}</p>
        {q.clientResponseToken ? (
          <p className="mt-1 text-[11px] text-slate-500">Client response link: configured (token on server)</p>
        ) : null}
      </details>
    </div>
  )
}

/** @param {{ invoice: Record<string, unknown>, clientLabel?: string }} props */
export function InvoiceDetailView({ invoice, clientLabel }) {
  const inv = invoice || {}
  const items = Array.isArray(inv.items) ? inv.items : []
  const currency = inv.currency || 'USD'

  return (
    <div className="space-y-1 text-slate-800 dark:text-slate-200">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={invoicePayTone(inv.paymentStatus)}>{inv.paymentStatus || 'Pending'}</Badge>
        <span className="text-lg font-bold text-slate-900 dark:text-white">{inv.invoiceId || 'Invoice'}</span>
      </div>
      <Section title="Bill to">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client" value={clientLabel} />
          <Field label="Related quote" value={inv.quoteId} />
          <Field label="Billing address" value={inv.billingAddress} span="full" />
        </div>
      </Section>
      {items.length > 0 ? (
        <Section title="Line items">
          <div className="overflow-x-auto rounded-none border border-slate-200 dark:border-slate-600">
            <table className="w-full min-w-[300px] text-left text-sm">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Line</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map((it, i) => {
                  const qty = Number(it.quantity) || 0
                  const price = Number(it.price) || 0
                  const taxAmt = calcLineTax(it)
                  const lineTot = qty * price + taxAmt
                  return (
                    <tr key={it.id || i} className="bg-white dark:bg-slate-900/40">
                      <td className="px-3 py-2 font-medium">{it.name || `Line ${i + 1}`}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(price, currency)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtMoney(lineTot, currency)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}
      <Section title="Amounts & payment">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Total" value={fmtMoney(inv.totalAmount, currency)} />
          <Field label="Paid" value={fmtMoney(inv.paidAmount, currency)} />
          <Field label="Balance due" value={fmtMoney(inv.dueAmount, currency)} />
          <Field label="Due date" value={fmtDate(inv.dueDate)} />
          <Field label="Method" value={inv.paymentMethod} />
        </div>
      </Section>
      <details className="mt-4 rounded-none border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">Technical reference</summary>
        <p className="mt-2 font-mono text-[11px] break-all">ID: {inv.id || '—'}</p>
      </details>
    </div>
  )
}

function userRoleTone(role) {
  if (role === 'admin') return 'blue'
  if (role === 'sales') return 'green'
  if (role === 'pricing') return 'yellow'
  if (role === 'boss') return 'violet'
  return 'neutral'
}

/** @param {{ user: Record<string, unknown> }} props */
export function UserDetailView({ user }) {
  const u = user || {}
  const av = u.avatar_url && String(u.avatar_url).trim()
  return (
    <div className="space-y-1 text-slate-800 dark:text-slate-200">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {av ? (
          <img
            src={av}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-cover shadow-sm dark:border-slate-600 dark:bg-slate-800"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={userRoleTone(u.role)}>{u.role || '—'}</Badge>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{u.name || 'User'}</span>
        </div>
      </div>
      <Section title="Account">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" value={u.email} span="full" />
          <Field label="Name" value={u.name} />
          <Field label="Role" value={u.role ? String(u.role) : ''} />
          <Field label="Member since" value={fmtDate(u.createdAt)} />
        </div>
      </Section>
      <details className="mt-4 rounded-none border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">Technical reference</summary>
        <p className="mt-2 font-mono text-[11px] break-all">ID: {u.id || '—'}</p>
      </details>
    </div>
  )
}
