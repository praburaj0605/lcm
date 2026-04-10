import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format } from 'date-fns'
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useHydrated } from '../../hooks/useHydrated'
import { Skeleton } from '../../components/ui/Skeleton'
import { SendBrevoEmailModal } from '../../components/email/SendBrevoEmailModal'
import { buildReportEmailContext, buildInternalReportEmailContext } from '../../services/emailPlaceholders'
import {
  REPORT_PRESETS,
  getRangeFromPreset,
  rangeFromInputs,
  formatRangeSubtitle,
  executiveKpis,
  enquiriesByField,
  quotationsByStatus,
  invoicesByPaymentStatus,
  monthlyTrend,
  topClientsByPaidRevenue,
  overdueInvoicesSummary,
  arAgingBuckets,
  rowsToCsv,
  downloadCsv,
  getSalesTeamUsers,
  deriveSalesFilteredEntities,
  salesTeamLeaderboard,
  filterInvoicesForSalesUserLedger,
  pipelineFunnelCounts,
  quoteOutcomeTable,
  cycleTimeStats,
  pricingUserWorkload,
  topFieldCounts,
  monthlyBilledVsPaid,
  invoicesByPaymentMethod,
} from '../../utils/reporting'

const tooltipStyle = {
  borderRadius: 0,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
}

const PIE_COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b']

function KpiTile({ label, value, sub }) {
  return (
    <div className="border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-va-blue)] dark:text-blue-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p> : null}
    </div>
  )
}

const TABS = [
  { id: 'overview', label: 'Executive overview' },
  { id: 'sales', label: 'Sales team performance' },
  { id: 'pipeline', label: 'Pipeline & enquiries' },
  { id: 'financial', label: 'Financial & AR' },
  { id: 'clients', label: 'Clients & export' },
  { id: 'operations', label: 'Operations & logistics' },
  { id: 'conversion', label: 'Conversion & velocity' },
]

export function ReportsPage() {
  const hydrated = useHydrated()
  const clients = useAppStore((s) => s.clients)
  const enquiries = useAppStore((s) => s.enquiries)
  const quotations = useAppStore((s) => s.quotations)
  const invoices = useAppStore((s) => s.invoices)
  const users = useAppStore((s) => s.users)
  const authUser = useAppStore((s) => s.auth.user)
  const brevoSettings = useAppStore((s) => s.brevoSettings)

  const [preset, setPreset] = useState('ytd')
  const [rangeMode, setRangeMode] = useState('preset')
  const [fromStr, setFromStr] = useState('')
  const [toStr, setToStr] = useState('')
  const [tab, setTab] = useState('overview')
  const [salesUserFilter, setSalesUserFilter] = useState('')
  const [mailOpen, setMailOpen] = useState(false)
  const [mailKey, setMailKey] = useState(0)

  const range = useMemo(() => {
    if (rangeMode === 'custom') return rangeFromInputs(fromStr, toStr)
    return getRangeFromPreset(preset)
  }, [rangeMode, preset, fromStr, toStr])

  const salesTeamUsers = useMemo(() => getSalesTeamUsers(users), [users])

  const { ce, cq, ci } = useMemo(
    () =>
      deriveSalesFilteredEntities(
        clients,
        enquiries,
        quotations,
        invoices,
        range,
        salesUserFilter || null,
        salesTeamUsers,
      ),
    [clients, enquiries, quotations, invoices, range, salesUserFilter, salesTeamUsers],
  )

  const kpis = useMemo(
    () =>
      executiveKpis({
        clients,
        enquiries,
        quotations,
        invoices,
        range,
        salesUserId: salesUserFilter || undefined,
        salesTeamUsers,
      }),
    [clients, enquiries, quotations, invoices, range, salesUserFilter, salesTeamUsers],
  )

  const salesLeaderboard = useMemo(
    () => salesTeamLeaderboard(clients, enquiries, quotations, invoices, range, salesTeamUsers),
    [clients, enquiries, quotations, invoices, range, salesTeamUsers],
  )

  const byService = useMemo(() => enquiriesByField(ce, 'serviceType'), [ce])
  const byTemplate = useMemo(() => enquiriesByField(ce, 'enquiryTemplate'), [ce])
  const byStatus = useMemo(() => enquiriesByField(ce, 'status'), [ce])
  const quoteStatus = useMemo(() => quotationsByStatus(cq), [cq])
  const invPay = useMemo(() => invoicesByPaymentStatus(ci), [ci])
  const trend = useMemo(() => monthlyTrend(ce, cq, ci, range), [ce, cq, ci, range])
  const topClients = useMemo(() => topClientsByPaidRevenue(ci, clients, 15), [ci, clients])

  const invoicesForAr = useMemo(
    () =>
      salesUserFilter
        ? filterInvoicesForSalesUserLedger(invoices, quotations, enquiries, salesUserFilter, salesTeamUsers)
        : invoices,
    [salesUserFilter, invoices, quotations, enquiries, salesTeamUsers],
  )

  const overdue = useMemo(() => overdueInvoicesSummary(invoicesForAr), [invoicesForAr])
  const aging = useMemo(() => arAgingBuckets(invoicesForAr), [invoicesForAr])

  const funnel = useMemo(() => pipelineFunnelCounts(ce, cq, ci), [ce, cq, ci])
  const quoteOutcomes = useMemo(() => quoteOutcomeTable(cq), [cq])
  const cycleStats = useMemo(() => cycleTimeStats(ce, cq, ci), [ce, cq, ci])
  const pricingLoad = useMemo(() => {
    const rows = pricingUserWorkload(ce)
    return rows.map((r) => {
      const u = users.find((x) => x.id === r.userId)
      return {
        ...r,
        name: u?.name || r.userId,
        email: u?.email || '',
        role: u?.role || '',
      }
    })
  }, [ce, users])
  const topOrigins = useMemo(() => topFieldCounts(ce, 'originCountry', 14), [ce])
  const topDests = useMemo(() => topFieldCounts(ce, 'destCountry', 14), [ce])
  const byShipment = useMemo(() => enquiriesByField(ce, 'shipmentType'), [ce])
  const bySalesChannel = useMemo(() => enquiriesByField(ce, 'salesChannel'), [ce])
  const byCustomerType = useMemo(() => enquiriesByField(ce, 'customerType'), [ce])
  const billedVsPaidTrend = useMemo(() => monthlyBilledVsPaid(ci, range), [ci, range])
  const invoicesByMethod = useMemo(() => invoicesByPaymentMethod(ci), [ci])

  const salesFocusLabel = useMemo(() => {
    if (!salesUserFilter) return 'All sales team (aggregate charts follow focus below)'
    const u = salesTeamUsers.find((x) => x.id === salesUserFilter)
    return u ? `Focus: ${u.name} (${u.email})` : 'Focus: selected rep'
  }, [salesUserFilter, salesTeamUsers])

  const sender = useMemo(
    () => ({
      name: authUser?.name,
      email: authUser?.email,
      company: brevoSettings.organizationName,
    }),
    [authUser?.name, authUser?.email, brevoSettings.organizationName],
  )

  const reportMailContextExternal = useMemo(
    () =>
      buildReportEmailContext({
        kpis,
        rangeSubtitle: formatRangeSubtitle(range),
        salesFocusLabel,
        sender,
      }),
    [kpis, range, salesFocusLabel, sender],
  )

  const reportMailContextInternal = useMemo(
    () =>
      buildInternalReportEmailContext({
        kpis,
        rangeSubtitle: formatRangeSubtitle(range),
        salesFocusLabel,
        sender,
      }),
    [kpis, range, salesFocusLabel, sender],
  )

  useEffect(() => {
    document.body.classList.add('reports-print-mode')
    return () => document.body.classList.remove('reports-print-mode')
  }, [])

  function exportSummaryCsv() {
    const cols = [
      { header: 'Metric', access: (r) => r.metric },
      { header: 'Value', access: (r) => r.value },
    ]
    const rows = [
      { metric: 'Period', value: formatRangeSubtitle(range) },
      { metric: 'Sales focus', value: salesUserFilter ? salesFocusLabel : 'All team' },
      { metric: salesUserFilter ? 'Clients (with rep enquiries)' : 'New clients', value: kpis.newClients },
      { metric: 'Enquiries', value: kpis.enquiries },
      { metric: 'Quotations', value: kpis.quotations },
      { metric: 'Invoices', value: kpis.invoices },
      { metric: 'Pipeline value (open enquiries)', value: kpis.pipelineValue.toFixed(2) },
      { metric: 'Quoted value (excl. draft/rejected)', value: kpis.quotedValue.toFixed(2) },
      { metric: 'Accepted quotes value', value: kpis.wonQuoteValue.toFixed(2) },
      { metric: 'Invoiced (total)', value: kpis.billed.toFixed(2) },
      { metric: 'Collected (paid)', value: kpis.collected.toFixed(2) },
      { metric: 'Outstanding', value: kpis.outstanding.toFixed(2) },
      { metric: 'Enquiry → quote rate %', value: kpis.conversionRate },
    ]
    downloadCsv(`management-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`, rowsToCsv(cols, rows))
  }

  function exportTableCsv(name, columns, rows) {
    downloadCsv(`${name}-${format(new Date(), 'yyyy-MM-dd')}.csv`, rowsToCsv(columns, rows))
  }

  function handlePrint() {
    window.print()
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8" data-management-report>
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-700 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">Management reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Consolidated operational and financial metrics from CRM data. Filter by period, review charts and tables, then print or export CSV
            for leadership packs.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{formatRangeSubtitle(range)}</p>
          <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">{salesFocusLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={exportSummaryCsv}>
            Export summary CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMailKey((k) => k + 1)
              setMailOpen(true)
            }}
          >
            Email summary (Brevo)
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint}>
            Print report pack
          </Button>
        </div>
      </div>

      <div className="no-print rounded-none border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Period mode</label>
              <Select
                value={rangeMode}
                onChange={(e) => {
                  setRangeMode(e.target.value)
                  if (e.target.value === 'preset') {
                    setFromStr('')
                    setToStr('')
                  }
                }}
              >
                <option value="preset">Preset</option>
                <option value="custom">Custom range</option>
              </Select>
            </div>
            {rangeMode === 'preset' ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Preset</label>
                <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
                  {REPORT_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">From</label>
                  <Input type="date" value={fromStr} onChange={(e) => setFromStr(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">To</label>
                  <Input type="date" value={toStr} onChange={(e) => setToStr(e.target.value)} />
                </div>
              </>
            )}
            <div className="min-w-[200px] max-w-xs">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Sales rep focus
              </label>
              <Select value={salesUserFilter} onChange={(e) => setSalesUserFilter(e.target.value)}>
                <option value="">All team — charts aggregate everyone (use Sales tab to compare reps)</option>
                {salesTeamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                Choose a rep to filter KPIs, pipeline, and financial charts to their enquiry → quote → invoice chain. Set
                “Sales owner (user)” on enquiries for accurate attribution; otherwise name/email text is matched.
              </p>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-1 border-t border-slate-100 pt-3 lg:border-0 lg:pt-0 dark:border-slate-700">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.id
                    ? 'border-[var(--color-va-blue)] bg-[var(--color-va-blue-soft)] text-[var(--color-va-blue)] dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="print-header mb-6 hidden border-b border-slate-300 pb-4 text-center print:block">
        <p className="text-lg font-bold text-slate-900">Logistics CRM — management report</p>
        <p className="text-sm text-slate-600">{formatRangeSubtitle(range)}</p>
        <p className="text-xs text-slate-600">{salesFocusLabel}</p>
        <p className="text-xs text-slate-500">Generated {format(new Date(), 'PPpp')}</p>
      </div>

      <div className={tab === 'overview' ? 'space-y-6' : 'hidden space-y-6 print:block print:break-inside-avoid'}>
        <h2 className="mb-4 hidden text-base font-bold text-slate-900 print:block">Executive overview</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile
              label={salesUserFilter ? 'Clients (rep enquiries, period)' : 'New clients (period)'}
              value={kpis.newClients}
            />
            <KpiTile label="Enquiries" value={kpis.enquiries} sub={`${kpis.conversionRate}% linked to a quote`} />
            <KpiTile label="Quotations" value={kpis.quotations} />
            <KpiTile label="Invoices" value={kpis.invoices} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label="Pipeline value"
              value={`$${kpis.pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub="Open enquiries (target / expected)"
            />
            <KpiTile
              label="Quoted value"
              value={`$${kpis.quotedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub="Excl. draft & rejected"
            />
            <KpiTile
              label="Collected"
              value={`$${kpis.collected.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub="Paid invoices in period"
            />
            <KpiTile
              label="Outstanding AR"
              value={`$${kpis.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              sub={
                salesUserFilter
                  ? "Open balance on this rep's linked invoices (full ledger chain)"
                  : 'All open invoices (full ledger, not filtered by period)'
              }
            />
          </div>

          <Card
            title="Activity & revenue trend"
            subtitle={
              salesUserFilter
                ? 'Filtered to selected rep — monthly counts and paid revenue by invoice date'
                : 'Monthly counts and paid revenue (all invoices, by invoice date)'
            }
            accent="from-[var(--color-va-blue)] to-emerald-600"
          >
            <div className="no-print mb-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'monthly-trend',
                    [
                      { header: 'Month', access: (r) => r.label },
                      { header: 'Enquiries', access: (r) => r.enquiries },
                      { header: 'Quotations', access: (r) => r.quotations },
                      { header: 'Revenue (paid)', access: (r) => r.revenue },
                    ],
                    trend,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="enquiries" name="Enquiries" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                  <Line yAxisId="left" type="monotone" dataKey="quotations" name="Quotations" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" name="Paid revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

      <div
        className={
          tab === 'sales' ? 'space-y-6' : 'hidden space-y-6 print:block print:break-before-page print:break-inside-avoid'
        }
      >
        <h2 className="mb-4 hidden text-base font-bold text-slate-900 print:block">Sales team performance</h2>
        <Card
          title="Leaderboard by sales owner"
          subtitle={`${formatRangeSubtitle(range)} — each row is that user\u2019s enquiry → quotation → invoice chain`}
          accent="from-violet-500 to-[var(--color-va-blue)]"
        >
          <div className="no-print mb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'sales-team-leaderboard',
                  [
                    { header: 'Name', access: (r) => r.name },
                    { header: 'Email', access: (r) => r.email },
                    { header: 'Role', access: (r) => r.role },
                    { header: 'Enquiries', access: (r) => r.enquiries },
                    { header: 'Quotations', access: (r) => r.quotations },
                    { header: 'Invoices', access: (r) => r.invoices },
                    { header: 'Distinct clients (enquiries)', access: (r) => r.distinctClientsWithEnquiries },
                    { header: 'Pipeline value', access: (r) => r.pipelineValue },
                    { header: 'Quoted value', access: (r) => r.quotedValue },
                    { header: 'Won quotes value', access: (r) => r.wonQuoteValue },
                    { header: 'Collected revenue', access: (r) => r.collectedRevenue },
                    { header: 'Conversion %', access: (r) => r.conversionRate },
                  ],
                  salesLeaderboard,
                )
              }
            >
              Export CSV
            </Button>
          </div>
          {salesTeamUsers.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No users with Sales or Admin role yet. Add them under Users so enquiries can be assigned for reporting.
            </p>
          ) : salesLeaderboard.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No rows to display.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                    <th className="py-2 pr-3 font-bold">Rep</th>
                    <th className="py-2 pr-3 font-bold">Role</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Enq.</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Quotes</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Inv.</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Clients</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Pipeline</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Won</th>
                    <th className="py-2 pr-3 font-bold tabular-nums">Collected</th>
                    <th className="py-2 font-bold tabular-nums">Conv.%</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLeaderboard.map((r) => (
                    <tr
                      key={r.userId}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        salesUserFilter === r.userId ? 'bg-violet-50 dark:bg-violet-950/30' : ''
                      }`}
                    >
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3 capitalize text-slate-600 dark:text-slate-400">{r.role}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.enquiries}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.quotations}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.invoices}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.distinctClientsWithEnquiries}</td>
                      <td className="py-2 pr-3 tabular-nums">${r.pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2 pr-3 tabular-nums">${r.wonQuoteValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2 pr-3 tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                        ${r.collectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 tabular-nums">{r.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Attribution: enquiry <code className="text-[11px]">assignedSalesUserId</code>, else match of sales person / assigned-to text to user
            name or email. Quotes must reference the enquiry; invoices must reference the quote.
          </p>
        </Card>

        {salesLeaderboard.length > 0 ? (
          <Card title="Volume comparison" subtitle="Enquiries vs paid revenue by rep (selected period)" accent="from-emerald-500 to-slate-800">
            <div className="h-[min(420px,60vh)] w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesLeaderboard.map((r) => ({
                    name: r.name.length > 14 ? `${r.name.slice(0, 13)}…` : r.name,
                    enquiries: r.enquiries,
                    collected: Math.round(r.collectedRevenue * 100) / 100,
                  }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={70} />
                  <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="enquiries" name="Enquiries" fill="#2563eb" radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="right" dataKey="collected" name="Collected ($)" fill="#10b981" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}
      </div>

      <div
        className={
          tab === 'pipeline'
            ? 'grid gap-6 lg:grid-cols-2'
            : 'hidden grid gap-6 print:grid print:break-before-page lg:grid-cols-2'
        }
      >
        <h2 className="col-span-full mb-2 hidden text-base font-bold text-slate-900 print:block">Pipeline & enquiries</h2>
          <Card
            title="Enquiries by status"
            subtitle={salesUserFilter ? 'Created in period — filtered to selected rep' : 'Created in selected period'}
            accent="from-amber-400 to-[var(--color-va-blue)]"
          >
            <div className="no-print mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'enquiries-by-status',
                    [
                      { header: 'Status', access: (r) => r.name },
                      { header: 'Count', access: (r) => r.count },
                    ],
                    byStatus,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatus} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Enquiries by service" subtitle="Mix in period" accent="from-violet-500 to-slate-700">
            <div className="h-72">
              {byService.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">No enquiries in period.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byService}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {byService.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Enquiry template mix" subtitle="When template is set on records" accent="from-teal-500 to-blue-800" className="lg:col-span-2">
            <div className="no-print mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'enquiries-by-template',
                    [
                      { header: 'Template', access: (r) => r.name },
                      { header: 'Count', access: (r) => r.count },
                    ],
                    byTemplate,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTemplate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Quotations by status" subtitle="Created in period — value = sum final amount" accent="from-emerald-500 to-slate-800" className="lg:col-span-2">
            <div className="no-print mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'quotations-by-status',
                    [
                      { header: 'Status', access: (r) => r.name },
                      { header: 'Count', access: (r) => r.count },
                      { header: 'Value', access: (r) => r.value },
                    ],
                    quoteStatus,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                    <th className="py-2 pr-4 font-bold">Status</th>
                    <th className="py-2 pr-4 font-bold">Count</th>
                    <th className="py-2 font-bold">Total value</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteStatus.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.count}</td>
                      <td className="py-2 tabular-nums">${r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

      <div className={tab === 'financial' ? 'space-y-6' : 'hidden space-y-6 print:block print:break-before-page'}>
        <h2 className="mb-4 hidden text-base font-bold text-slate-900 print:block">Financial & AR</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiTile label="Overdue invoices (all data)" value={overdue.overdueCount} sub={`$${overdue.overdueAmount.toFixed(2)} at risk`} />
            <KpiTile label="Open invoices" value={overdue.openCount} />
            <KpiTile label="Accepted quotes (period)" value={`$${kpis.wonQuoteValue.toFixed(0)}`} sub="Won value" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Invoices by payment status" subtitle="Invoices created in selected period" accent="from-rose-400 to-[var(--color-va-blue)]">
              <div className="h-72">
                {invPay.length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-slate-500">No invoices in period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={invPay} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {invPay.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card
              title="AR aging (open invoices)"
              subtitle={
                salesUserFilter
                  ? "By days past due — this rep's linked open invoices only"
                  : 'By days past due date — entire ledger'
              }
              accent="from-orange-500 to-red-800"
            >
              <div className="no-print mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="!py-1 !text-xs"
                  onClick={() =>
                    exportTableCsv(
                      'ar-aging',
                      [
                        { header: 'Bucket', access: (r) => r.name },
                        { header: 'Invoices', access: (r) => r.count },
                        { header: 'Amount', access: (r) => r.amount },
                      ],
                      aging,
                    )
                  }
                >
                  Export CSV
                </Button>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aging}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Amount']} />
                    <Bar dataKey="amount" fill="#ea580c" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>

      <div className={tab === 'clients' ? 'print:break-inside-avoid' : 'hidden print:block print:break-before-page print:break-inside-avoid'}>
        <h2 className="mb-4 hidden text-base font-bold text-slate-900 print:block">Clients & revenue</h2>
        <Card title="Top clients by collected revenue" subtitle="Paid invoice amounts in selected period" accent="from-[var(--color-va-blue)] to-violet-700">
          <div className="no-print mb-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                exportTableCsv(
                  'top-clients-revenue',
                  [
                    { header: 'Client', access: (r) => r.name },
                    { header: 'Revenue (paid)', access: (r) => r.revenue },
                  ],
                  topClients,
                )
              }
            >
              Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                  <th className="py-2 pr-4 font-bold">#</th>
                  <th className="py-2 pr-4 font-bold">Client</th>
                  <th className="py-2 font-bold">Paid revenue</th>
                </tr>
              </thead>
              <tbody>
                {topClients.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500">
                      No paid invoices in this period.
                    </td>
                  </tr>
                ) : (
                  topClients.map((r, i) => (
                    <tr key={r.clientId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-4 tabular-nums text-slate-500">{i + 1}</td>
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 tabular-nums font-medium">${r.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div
        className={
          tab === 'operations' ? 'space-y-6' : 'hidden space-y-6 print:block print:break-before-page print:break-inside-avoid'
        }
      >
        <h2 className="mb-4 hidden text-base font-bold text-slate-900 print:block">Operations & logistics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Enquiries (period)" value={funnel.enquiries} />
          <KpiTile label="With ≥1 quote" value={funnel.enquiriesWithQuote} sub="Distinct enquiries linked" />
          <KpiTile label="Quotations" value={funnel.quotations} />
          <KpiTile label="Invoices (linked chain)" value={funnel.invoices} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Shipment direction" subtitle="Enquiries in period" accent="from-cyan-500 to-blue-800">
            <div className="no-print mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'enquiries-by-shipment-type',
                    [
                      { header: 'Shipment', access: (r) => r.name },
                      { header: 'Count', access: (r) => r.count },
                    ],
                    byShipment,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="h-72">
              {byShipment.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byShipment}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {byShipment.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Service mix" subtitle="Air / sea / road / multimodal" accent="from-sky-500 to-indigo-900">
            <div className="h-72">
              {byService.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-slate-500">No data.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byService}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <Card title="Sales channel & customer type" subtitle="How demand enters the CRM" accent="from-teal-600 to-slate-800">
          <div className="no-print mb-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'enquiries-by-channel',
                  [
                    { header: 'Channel', access: (r) => r.name },
                    { header: 'Count', access: (r) => r.count },
                  ],
                  bySalesChannel,
                )
              }
            >
              Export channels
            </Button>
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'enquiries-by-customer-type',
                  [
                    { header: 'Customer type', access: (r) => r.name },
                    { header: 'Count', access: (r) => r.count },
                  ],
                  byCustomerType,
                )
              }
            >
              Export customer types
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bySalesChannel} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCustomerType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Top origin countries" subtitle="From enquiry origin (code or label)" accent="from-amber-500 to-slate-800">
            <div className="no-print mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'top-origin-countries',
                    [
                      { header: 'Origin', access: (r) => r.name },
                      { header: 'Enquiries', access: (r) => r.count },
                    ],
                    topOrigins,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                    <th className="py-2 pr-3 font-bold">#</th>
                    <th className="py-2 pr-3 font-bold">Origin</th>
                    <th className="py-2 font-bold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topOrigins.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        No origins in period.
                      </td>
                    </tr>
                  ) : (
                    topOrigins.map((r, i) => (
                      <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3 tabular-nums text-slate-500">{i + 1}</td>
                        <td className="py-2 pr-3">{r.name}</td>
                        <td className="py-2 tabular-nums">{r.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Top destination countries" subtitle="From enquiry destination" accent="from-rose-500 to-slate-900">
            <div className="no-print mb-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="!py-1 !text-xs"
                onClick={() =>
                  exportTableCsv(
                    'top-destination-countries',
                    [
                      { header: 'Destination', access: (r) => r.name },
                      { header: 'Enquiries', access: (r) => r.count },
                    ],
                    topDests,
                  )
                }
              >
                Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                    <th className="py-2 pr-3 font-bold">#</th>
                    <th className="py-2 pr-3 font-bold">Destination</th>
                    <th className="py-2 font-bold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topDests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        No destinations in period.
                      </td>
                    </tr>
                  ) : (
                    topDests.map((r, i) => (
                      <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3 tabular-nums text-slate-500">{i + 1}</td>
                        <td className="py-2 pr-3">{r.name}</td>
                        <td className="py-2 tabular-nums">{r.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card title="Pricing team workload" subtitle="Count of enquiries where each pricing user is assigned (enquiry or line)" accent="from-violet-600 to-slate-900">
          <div className="no-print mb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'pricing-workload',
                  [
                    { header: 'User', access: (r) => r.name },
                    { header: 'Email', access: (r) => r.email },
                    { header: 'Role', access: (r) => r.role },
                    { header: 'Enquiry touches', access: (r) => r.count },
                  ],
                  pricingLoad,
                )
              }
            >
              Export CSV
            </Button>
          </div>
          {pricingLoad.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No pricing assignments in filtered enquiries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                    <th className="py-2 pr-3 font-bold">User</th>
                    <th className="py-2 pr-3 font-bold">Role</th>
                    <th className="py-2 font-bold">Enquiries</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingLoad.map((r) => (
                    <tr key={r.userId} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3 capitalize text-slate-600 dark:text-slate-400">{r.role || '—'}</td>
                      <td className="py-2 tabular-nums">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title="Monthly billed vs collected"
          subtitle="By invoice issue month — total billed vs paid amounts"
          accent="from-indigo-500 to-emerald-700"
        >
          <div className="no-print mb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'monthly-billed-vs-paid',
                  [
                    { header: 'Month', access: (r) => r.label },
                    { header: 'Total billed', access: (r) => r.billed },
                    { header: 'Cash collected', access: (r) => r.paid },
                  ],
                  billedVsPaidTrend,
                )
              }
            >
              Export CSV
            </Button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={billedVsPaidTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, '']} />
                <Legend />
                <Line type="monotone" dataKey="billed" name="Total billed" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="paid" name="Cash collected" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Invoices by payment method" subtitle="Scoped to period & sales filter" accent="from-slate-600 to-slate-900">
          <div className="no-print mb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'invoices-by-payment-method',
                  [
                    { header: 'Method', access: (r) => r.name },
                    { header: 'Count', access: (r) => r.count },
                    { header: 'Total amount', access: (r) => r.amount },
                  ],
                  invoicesByMethod,
                )
              }
            >
              Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                  <th className="py-2 pr-3 font-bold">Method</th>
                  <th className="py-2 pr-3 font-bold">Count</th>
                  <th className="py-2 font-bold">Invoice total</th>
                </tr>
              </thead>
              <tbody>
                {invoicesByMethod.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      No invoices in scope.
                    </td>
                  </tr>
                ) : (
                  invoicesByMethod.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.count}</td>
                      <td className="py-2 tabular-nums">${r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div
        className={
          tab === 'conversion' ? 'space-y-6' : 'hidden space-y-6 print:block print:break-before-page print:break-inside-avoid'
        }
      >
        <h2 className="mb-4 hidden text-base font-bold text-slate-900 print:block">Conversion & velocity</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Quote rate"
            value={
              funnel.enquiries
                ? `${Math.round((funnel.enquiriesWithQuote / funnel.enquiries) * 1000) / 10}%`
                : '—'
            }
            sub="Enquiries with ≥1 quote"
          />
          <KpiTile label="Accepted quotes" value={funnel.quotationsAccepted} />
          <KpiTile label="Rejected quotes" value={funnel.quotationsRejected} />
          <KpiTile label="Invoices on linked quotes" value={funnel.invoices} />
        </div>

        <Card title="Quote outcomes (value)" subtitle="Quotations in filtered period & sales focus" accent="from-emerald-600 to-blue-900">
          <div className="no-print mb-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="!py-1 !text-xs"
              onClick={() =>
                exportTableCsv(
                  'quote-outcomes',
                  [
                    { header: 'Bucket', access: (r) => r.name },
                    { header: 'Count', access: (r) => r.count },
                    { header: 'Sum final amount', access: (r) => r.value },
                  ],
                  quoteOutcomes,
                )
              }
            >
              Export CSV
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-600">
                    <th className="py-2 pr-3 font-bold">Status bucket</th>
                    <th className="py-2 pr-3 font-bold">Count</th>
                    <th className="py-2 font-bold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteOutcomes.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3 tabular-nums">{r.count}</td>
                      <td className="py-2 tabular-nums">${r.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quoteOutcomes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={65} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Value']} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Enquiry → quotation lag" subtitle="Calendar days between enquiry and first linked quote (in scope)" accent="from-blue-600 to-slate-900">
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-semibold">Pairs:</span> {cycleStats.enquiryToQuoteDays.n}
              </p>
              <p>
                <span className="font-semibold">Median days:</span>{' '}
                {cycleStats.enquiryToQuoteDays.median ?? '—'}
              </p>
              <p>
                <span className="font-semibold">Mean days:</span> {cycleStats.enquiryToQuoteDays.mean ?? '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only includes quotations whose enquiry is in the filtered enquiry set. Multiple quotes from one enquiry each
                contribute a row.
              </p>
            </div>
          </Card>
          <Card title="Quotation → invoice lag" subtitle="Days from quote creation to invoice creation" accent="from-orange-600 to-slate-900">
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-semibold">Pairs:</span> {cycleStats.quoteToInvoiceDays.n}
              </p>
              <p>
                <span className="font-semibold">Median days:</span>{' '}
                {cycleStats.quoteToInvoiceDays.median ?? '—'}
              </p>
              <p>
                <span className="font-semibold">Mean days:</span> {cycleStats.quoteToInvoiceDays.mean ?? '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uses invoice <code className="text-[11px]">quoteId</code> and matching quotation dates.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <SendBrevoEmailModal
        key={mailKey}
        open={mailOpen}
        onClose={() => setMailOpen(false)}
        category="report"
        placeholderContext={reportMailContextExternal}
        placeholderContextInternal={reportMailContextInternal}
        allowAudienceToggle
        defaultTo={authUser?.email || ''}
        title="Share report summary (Brevo)"
      />
    </div>
  )
}
