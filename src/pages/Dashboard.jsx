import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { Card } from '../components/ui/Card'
import { computeRevenue, enquiryStatusCounts, revenueTrend } from '../utils/metrics'
import { canSeeEnquiry, canViewAllEnquiries } from '../utils/permissions'
import { useHydrated } from '../hooks/useHydrated'
import { Skeleton } from '../components/ui/Skeleton'

const tooltipStyle = {
  borderRadius: 0,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
}

function StatCard({ title, value, icon, iconBg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card flush className="overflow-hidden">
        <div className="flex items-start gap-4 p-6">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-none border border-slate-200/80 text-2xl shadow-inner ${iconBg}`}
            aria-hidden
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-va-blue)] dark:text-blue-400">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">{value}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export function DashboardPage() {
  const hydrated = useHydrated()
  const role = useAppStore((s) => s.auth.user?.role)
  const userId = useAppStore((s) => s.auth.user?.id)
  const clients = useAppStore((s) => s.clients)
  const enquiries = useAppStore((s) => s.enquiries)
  const quotations = useAppStore((s) => s.quotations)
  const invoices = useAppStore((s) => s.invoices)

  const enquiriesScoped = useMemo(() => {
    if (!role || !userId) return enquiries
    if (canViewAllEnquiries(role)) return enquiries
    return enquiries.filter((e) => canSeeEnquiry(role, e, userId))
  }, [enquiries, role, userId])

  const showSalesKpis = role !== 'pricing'

  const revenue = useMemo(() => computeRevenue(invoices), [invoices])
  const enc = useMemo(() => enquiryStatusCounts(enquiriesScoped), [enquiriesScoped])
  const barData = useMemo(
    () => [
      { name: 'New', count: enc.New, fill: '#eab308' },
      { name: 'In Progress', count: enc['In Progress'], fill: '#2563eb' },
      { name: 'Quoted', count: enc.Quoted, fill: '#8b5cf6' },
      { name: 'Closed', count: enc.Closed, fill: '#10b981' },
    ],
    [enc],
  )
  const trend = useMemo(() => revenueTrend(invoices), [invoices])

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          KPIs and charts from your local CRM data — layout inspired by{' '}
          <a
            className="font-medium text-[var(--color-va-blue)] underline-offset-2 hover:underline dark:text-blue-400"
            href="https://admin-demo.vuestic.dev/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Vuestic Admin
          </a>
          .
        </p>
      </div>

      {showSalesKpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total clients"
            value={clients.length}
            delay={0}
            icon="👥"
            iconBg="bg-[var(--color-va-blue-soft)] text-[var(--color-va-blue)]"
          />
          <StatCard
            title="Enquiries"
            value={enquiriesScoped.length}
            delay={0.05}
            icon="✉️"
            iconBg="bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 dark:from-amber-900/40 dark:to-amber-900/20 dark:text-amber-300"
          />
          <StatCard
            title="Quotations"
            value={quotations.length}
            delay={0.1}
            icon="📄"
            iconBg="bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 dark:from-emerald-900/40 dark:to-emerald-900/20 dark:text-emerald-300"
          />
          <StatCard
            title="Revenue (paid)"
            value={`$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            delay={0.15}
            icon="💰"
            iconBg="bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 dark:from-rose-900/40 dark:to-rose-900/20 dark:text-rose-300"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Assigned enquiries"
            value={enquiriesScoped.length}
            delay={0}
            icon="✉️"
            iconBg="bg-gradient-to-br from-violet-100 to-violet-50 text-violet-800 dark:from-violet-900/40 dark:to-violet-900/20 dark:text-violet-200"
          />
          <StatCard
            title="In progress (assigned)"
            value={enquiriesScoped.filter((e) => e.status === 'In Progress').length}
            delay={0.05}
            icon="⏳"
            iconBg="bg-gradient-to-br from-amber-100 to-amber-50 text-amber-800 dark:from-amber-900/40 dark:to-amber-900/20 dark:text-amber-200"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Enquiries by status" subtitle={showSalesKpis ? 'Pipeline distribution' : 'Your assignments'} accent="from-[var(--color-va-blue)] via-blue-400 to-amber-400">
          <div className="h-72 w-full -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="count" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {showSalesKpis ? (
          <Card title="Paid revenue trend" subtitle="Last 6 months (invoices)" accent="from-emerald-400 via-[var(--color-va-blue)] to-blue-600">
            <div className="h-72 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : (
          <Card title="Pricing workspace" subtitle="Use Enquiries to open assigned leads and add line-item prices." accent="from-violet-500 to-slate-700">
            <p className="p-6 text-sm text-slate-600 dark:text-slate-400">
              You only see enquiries your sales team assigns to you. Use the tag icon on a row to enter multiple price options per line.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
