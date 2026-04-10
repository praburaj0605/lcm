import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider.jsx'

/** @typedef {{ to?: string, labelKey?: string, label?: string }} Crumb */

const SECTION = {
  reports: { list: '/reports', listKey: 'breadcrumb.reports' },
  clients: {
    list: '/clients',
    listKey: 'breadcrumb.clients',
    newKey: 'breadcrumb.newClient',
    editKey: 'breadcrumb.editClient',
  },
  enquiries: {
    list: '/enquiries',
    listKey: 'breadcrumb.enquiries',
    newKey: 'breadcrumb.newEnquiry',
    editKey: 'breadcrumb.editEnquiry',
    pricingKey: 'breadcrumb.linePricing',
  },
  quotations: {
    list: '/quotations',
    listKey: 'breadcrumb.quotations',
    newKey: 'breadcrumb.newQuotation',
    editKey: 'breadcrumb.editQuotation',
  },
  invoices: {
    list: '/invoices',
    listKey: 'breadcrumb.invoices',
    newKey: 'breadcrumb.newInvoice',
    editKey: 'breadcrumb.editInvoice',
  },
  users: {
    list: '/users',
    listKey: 'breadcrumb.users',
    newKey: 'breadcrumb.newUser',
    editKey: 'breadcrumb.editUser',
  },
  settings: { list: '/settings', listKey: 'breadcrumb.settings' },
  'email-templates': { list: '/email-templates', listKey: 'breadcrumb.emailTemplates' },
}

/**
 * @param {string} pathname
 * @returns {Crumb[]}
 */
function crumbsForPath(pathname) {
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length === 0) {
    return [{ labelKey: 'breadcrumb.home' }]
  }

  if (parts[0] === 'dashboard' || pathname === '/') {
    return [{ labelKey: 'breadcrumb.dashboard' }]
  }

  /** @type {Crumb[]} */
  const out = [{ to: '/dashboard', labelKey: 'breadcrumb.dashboard' }]

  const sectionKey = parts[0]
  const cfg = SECTION[sectionKey]
  if (!cfg) {
    let acc = ''
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      acc += `/${p}`
      const isLast = i === parts.length - 1
      out.push(isLast ? { label: humanizeSegment(p) } : { to: acc, label: humanizeSegment(p) })
    }
    return out
  }

  if (parts.length === 1) {
    out.push({ labelKey: cfg.listKey })
    return out
  }

  out.push({ to: cfg.list, labelKey: cfg.listKey })

  if (parts[1] === 'new') {
    out.push({ labelKey: cfg.newKey ?? 'breadcrumb.dashboard' })
    return out
  }

  if (parts[1] === 'new-legacy') {
    out.push({ labelKey: 'breadcrumb.newEnquiryLegacy' })
    return out
  }

  if (parts[2] === 'edit') {
    out.push({ labelKey: cfg.editKey ?? 'breadcrumb.dashboard' })
    return out
  }

  if (sectionKey === 'enquiries' && parts[2] === 'pricing') {
    out.push({ labelKey: cfg.pricingKey ?? 'breadcrumb.linePricing' })
    return out
  }

  out.push({ label: humanizeSegment(parts[parts.length - 1] ?? '') })
  return out
}

function humanizeSegment(seg) {
  if (!seg) return '—'
  return seg
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function crumbText(c, t) {
  if (c.labelKey) return t(c.labelKey)
  return c.label ?? '—'
}

export function AppBreadcrumbs() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const items = crumbsForPath(pathname)

  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-5 border-b border-slate-100 pb-4 dark:border-slate-800/80">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          const text = crumbText(item, t)
          return (
            <li key={`${item.to ?? ''}-${item.labelKey ?? ''}-${item.label ?? ''}-${i}`} className="flex items-center gap-2">
              {i > 0 ? (
                <span className="select-none text-slate-300 dark:text-slate-600" aria-hidden>
                  /
                </span>
              ) : null}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium text-[var(--color-va-blue)] transition hover:underline dark:text-blue-400"
                >
                  {text}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? 'font-semibold text-red-600 dark:text-red-400'
                      : 'font-medium text-slate-600 dark:text-slate-400'
                  }
                >
                  {text}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
