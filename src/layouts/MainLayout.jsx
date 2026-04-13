import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { useEffectiveRole } from '../hooks/useEffectiveRole'
import { Button } from '../components/ui/Button'
import { navIcons } from '../components/ui/NavIcons'
import { toast } from 'sonner'
import { isApiMode } from '../services/apiMode'
import { AppBreadcrumbs } from '../components/navigation/AppBreadcrumbs'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { CHROME_THEME_VUESTIC } from '../theme/chromeThemes'

const navDef = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: 'dashboard', roles: ['admin', 'sales', 'pricing', 'boss'] },
  { to: '/reports', labelKey: 'nav.reports', icon: 'reports', roles: ['admin', 'boss'] },
  { to: '/clients', labelKey: 'nav.clients', icon: 'clients', roles: ['admin', 'sales', 'boss'] },
  { to: '/enquiries', labelKey: 'nav.enquiries', icon: 'enquiries', roles: ['admin', 'sales', 'pricing', 'boss'] },
  {
    to: '/enquiries/new-legacy',
    labelKey: 'nav.enquiriesLegacy',
    icon: 'enquiries',
    roles: ['admin', 'sales', 'boss'],
    navEnd: true,
  },
  { to: '/quotations', labelKey: 'nav.quotations', icon: 'quotations', roles: ['admin', 'sales', 'boss'] },
  { to: '/invoices', labelKey: 'nav.invoices', icon: 'invoices', roles: ['admin', 'sales', 'boss'] },
  { to: '/users', labelKey: 'nav.users', icon: 'users', roles: ['admin', 'boss'] },
  { to: '/email-templates', labelKey: 'nav.emailTemplates', icon: 'mail', roles: ['admin', 'boss'] },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings', roles: ['admin', 'sales', 'pricing', 'boss'] },
]

function isNavActive(pathname, itemTo) {
  if (itemTo === '/dashboard') return pathname === '/dashboard'
  return pathname === itemTo || pathname.startsWith(`${itemTo}/`)
}

function NavItems({ onNavigate, collapsed }) {
  const token = useAppStore((s) => s.auth.token)
  const role = useEffectiveRole()
  const navigate = useNavigate()
  const logout = useAppStore((s) => s.logout)
  const location = useLocation()
  const { t } = useI18n()

  const nav = navDef.filter((item) => (role ? item.roles.includes(role) : true))

  const linkClass = (itemTo) => {
    const active = isNavActive(location.pathname, itemTo)
    return `group flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
      active
        ? 'border-[var(--color-va-blue)] bg-[var(--color-va-sidebar-active)] text-[var(--color-va-blue)] dark:text-blue-400'
        : 'border-transparent text-slate-600 hover:bg-[var(--color-va-sidebar-hover)] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[var(--color-va-sidebar-hover)] dark:hover:text-slate-100'
    } ${collapsed ? 'justify-center px-2' : ''}`
  }
  const iconClass =
    'text-slate-400 group-aria-[current=page]:text-[var(--color-va-blue)] dark:group-aria-[current=page]:text-blue-400 dark:text-slate-500'

  return (
    <nav className={`flex flex-col ${collapsed ? 'items-stretch' : ''}`}>
      {!collapsed ? (
        <p className="app-chrome-nav-heading mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-va-blue)] dark:text-blue-400">
          {t('nav.mainMenu')}
        </p>
      ) : null}
      <div className="flex flex-col gap-0">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.navEnd === true}
            onClick={onNavigate}
            className={linkClass(item.to)}
            title={collapsed ? t(item.labelKey) : undefined}
          >
            <span className={iconClass}>{navIcons[item.icon]}</span>
            {!collapsed ? <span>{t(item.labelKey)}</span> : null}
          </NavLink>
        ))}
      </div>

      {!collapsed ? (
        <p className="app-chrome-nav-heading mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-va-blue)] dark:text-blue-400">
          {t('nav.account')}
        </p>
      ) : (
        <div className="my-3 border-t border-[var(--color-va-sidebar-border)]" />
      )}
      {!token ? (
        <NavLink
          to="/login"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'border-[var(--color-va-blue)] bg-[var(--color-va-sidebar-active)] text-[var(--color-va-blue)] dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:bg-[var(--color-va-sidebar-hover)] hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            } ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? t('nav.login') : undefined}
        >
          <span className={iconClass}>{navIcons.login}</span>
          {!collapsed ? <span>{t('nav.login')}</span> : null}
        </NavLink>
      ) : (
        <Button
          type="button"
          variant="sidebar"
          className={`justify-start gap-3 !rounded-none !py-2.5 !font-medium ${collapsed ? '!justify-center !px-2' : ''}`}
          title={collapsed ? t('nav.logout') : undefined}
          onClick={() => {
            logout()
            toast.success('Logged out')
            navigate('/login')
            onNavigate?.()
          }}
        >
          <span className="text-slate-400 dark:text-slate-500">{navIcons.logout}</span>
          {!collapsed ? <span>{t('nav.logout')}</span> : null}
        </Button>
      )}
    </nav>
  )
}

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const sessionUser = useAppStore((s) => s.auth.user)
  const effectiveRole = useEffectiveRole()
  const token = useAppStore((s) => s.auth.token)
  const bootstrapFromApi = useAppStore((s) => s.bootstrapFromApi)
  const chromeTheme = useAppStore((s) => s.chromeTheme)
  const { t } = useI18n()

  useEffect(() => {
    if (!isApiMode() || !token) return
    const { clients } = useAppStore.getState()
    if (clients.length > 0) return
    void bootstrapFromApi().catch((e) => {
      console.error(e)
      toast.error('Could not load data from the server.')
    })
  }, [token, bootstrapFromApi])

  return (
    <div className="app-shell flex h-svh min-h-0 overflow-hidden">
      <aside
        className={`hidden min-h-0 shrink-0 flex-col border-r border-[var(--color-va-sidebar-border)] bg-[var(--color-va-sidebar)] text-slate-800 shadow-[1px_0_0_rgba(15,23,42,0.06)] dark:text-slate-100 md:flex ${
          collapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-va-sidebar-border)] px-4 py-5">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-[var(--color-va-sidebar-border)] bg-[var(--color-va-blue)] text-lg font-bold text-white shadow-sm">
                L
              </div>
              <div>
                <p className="app-chrome-brand-meta text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-va-blue)] dark:text-blue-400">
                  Logistics
                </p>
                <p className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">CRM</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[var(--color-va-sidebar-border)] bg-[var(--color-va-blue)] text-sm font-bold text-white">
              L
            </div>
          )}
          <button
            type="button"
            className="border border-[var(--color-va-sidebar-border)] bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/90"
            onClick={() => setCollapsed((c) => !c)}
            title="Toggle sidebar"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-4">
          <NavItems collapsed={collapsed} />
        </div>
        {!collapsed ? (
          <div className="border-t border-[var(--color-va-sidebar-border)] p-4">
            {chromeTheme === CHROME_THEME_VUESTIC ? (
              <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                UI inspired by{' '}
                <a
                  className="font-medium text-[var(--color-va-blue)] underline-offset-2 hover:underline dark:text-blue-400"
                  href="https://admin-demo.vuestic.dev/dashboard"
                  target="_blank"
                  rel="noreferrer"
                >
                  Vuestic Admin
                </a>
              </p>
            ) : (
              <p className="app-chrome-brand-meta text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                FreightDesk chrome — IBM Plex & panel layout. Switch to <strong className="font-semibold text-slate-700 dark:text-slate-300">Vuestic</strong> in Settings → Appearance.
              </p>
            )}
          </div>
        ) : null}
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-[var(--color-va-sidebar-border)] bg-[var(--color-va-sidebar)] p-4 shadow-xl dark:text-slate-100"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[var(--color-va-sidebar-border)] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center border border-[var(--color-va-sidebar-border)] bg-[var(--color-va-blue)] text-sm font-bold text-white">
                    L
                  </div>
                  <span className="app-chrome-nav-heading text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-va-blue)] dark:text-blue-400">
                    Menu
                  </span>
                </div>
                <Button type="button" variant="ghost" onClick={() => setMobileOpen(false)}>
                  ✕
                </Button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} collapsed={false} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="app-shell-main flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="app-chrome-header z-30 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3.5 shadow-sm dark:border-slate-800 dark:bg-[#1e2130]">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </Button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-va-blue)] dark:text-blue-400">
                {t('layout.overview')}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('layout.console')}</p>
              {sessionUser ? (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {sessionUser.name} ·{' '}
                  <span className="font-medium capitalize">{effectiveRole ?? sessionUser.role ?? '—'}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {import.meta.env.VITE_API_BASE_URL ? (
              <span className="hidden border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline">
                {import.meta.env.VITE_API_BASE_URL}
              </span>
            ) : null}
          </div>
        </header>
        <main className="va-canvas min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            className="app-outlet-frame"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <AppBreadcrumbs />
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}
