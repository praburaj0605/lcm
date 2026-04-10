import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getApiBaseUrl } from '../services/apiClient'
import { clearStorageKey } from '../services/storageService'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { sendTransactionalEmail, validateBrevoConfig } from '../services/brevoClient'
import { isApiMode } from '../services/apiMode'
import { apiBrevoSend, apiDemoDataStatus, apiRemoveDemoData, apiSeedDemoData } from '../services/crmApi'
import { buildFinalEmailHtml, interpolateTemplate } from '../services/emailPlaceholders'
import { pickTemplateForCategory } from '../services/emailTemplatePick'
import { I18N_LANGUAGES } from '../i18n/languages'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SettingsCodeConventions } from './settings/SettingsCodeConventions.jsx'
import { SettingsAppearance } from './settings/SettingsAppearance.jsx'

export function SettingsPage() {
  const { t } = useI18n()
  const locale = useAppStore((s) => s.locale)
  const enabledLocales = useAppStore((s) => s.enabledLocales)
  const setI18nLocale = useAppStore((s) => s.setI18nLocale)
  const toggleI18nLocaleEnabled = useAppStore((s) => s.toggleI18nLocaleEnabled)
  const clearAllData = useAppStore((s) => s.clearAllData)
  const brevoSettings = useAppStore((s) => s.brevoSettings)
  const setBrevoSettings = useAppStore((s) => s.setBrevoSettings)
  const emailTemplates = useAppStore((s) => s.emailTemplates)
  const authUser = useAppStore((s) => s.auth.user)
  const bootstrapFromApi = useAppStore((s) => s.bootstrapFromApi)

  const [confirmClear, setConfirmClear] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [demoStatus, setDemoStatus] = useState(null)
  const [demoBusy, setDemoBusy] = useState(false)
  const [confirmRemoveDemo, setConfirmRemoveDemo] = useState(false)
  const [confirmReplaceDemo, setConfirmReplaceDemo] = useState(false)

  useEffect(() => {
    if (!isApiMode() || authUser?.role !== 'admin') {
      setDemoStatus(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const s = await apiDemoDataStatus()
        if (!cancelled) setDemoStatus(s)
      } catch {
        if (!cancelled) setDemoStatus(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authUser?.role, authUser?.id])

  async function sendTestNotification() {
    if (!isApiMode()) {
      const v = validateBrevoConfig({
        apiKey: brevoSettings.apiKey,
        senderEmail: brevoSettings.senderEmail,
      })
      if (!v.ok) {
        toast.error(v.error)
        return
      }
    } else if (!brevoSettings.senderEmail?.trim()) {
      toast.error('Sender email is required for test send')
      return
    }
    const to = (testTo.trim() || authUser?.email || '').trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error('Enter a valid test recipient email (or stay logged in to default to your user email)')
      return
    }
    const tpl = pickTemplateForCategory(emailTemplates, 'internal_email', null)
    if (!tpl) {
      toast.error('No internal email template. Restore defaults on Email templates or create one.')
      return
    }
    const ctx = {
      subjectLine: 'Brevo test — Logistics CRM',
      body: '<p>This is a test notification from your CRM Brevo integration.</p>',
      senderName: authUser?.name || brevoSettings.senderName || '',
      senderEmail: authUser?.email || brevoSettings.senderEmail || '',
    }
    const subject = interpolateTemplate(tpl.subjectTemplate, ctx)
    const inner = interpolateTemplate(tpl.bodyHtmlTemplate, ctx)
    const html = buildFinalEmailHtml({
      category: 'internal_email',
      bodyAfterInterpolation: inner,
      branding: tpl.branding,
    })
    setSendingTest(true)
    try {
      if (isApiMode()) {
        await apiBrevoSend({
          sender: {
            email: brevoSettings.senderEmail,
            name: brevoSettings.senderName || brevoSettings.organizationName || undefined,
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          ...(brevoSettings.replyToEmail?.trim()
            ? { replyTo: { email: brevoSettings.replyToEmail.trim() } }
            : {}),
        })
        toast.success('Test email sent (server Brevo proxy)')
      } else {
        const result = await sendTransactionalEmail({
          apiKey: brevoSettings.apiKey,
          sender: {
            email: brevoSettings.senderEmail,
            name: brevoSettings.senderName || brevoSettings.organizationName || undefined,
          },
          to,
          subject,
          htmlContent: html,
          replyTo: brevoSettings.replyToEmail || undefined,
        })
        if (!result.ok) toast.error(result.error || 'Send failed')
        else toast.success('Test email sent')
      }
    } catch (e) {
      const d = e?.response?.data?.detail
      toast.error(typeof d === 'string' ? d : e?.message || 'Send failed')
    } finally {
      setSendingTest(false)
    }
  }

  function onClear() {
    clearAllData()
    clearStorageKey()
    try {
      useAppStore.persist?.clearStorage?.()
    } catch {
      /* noop */
    }
    toast.success('All local data cleared')
    setConfirmClear(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
      </div>

      <Card title="API configuration" subtitle="Read-only (from .env)" accent="from-blue-600 to-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-white">VITE_API_BASE_URL:</span>{' '}
          <code className="rounded-none bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{getApiBaseUrl() || '(empty)'}</code>
        </p>
      </Card>

      {isApiMode() && (authUser?.role === 'admin' || authUser?.role === 'boss') ? (
        <Card
          title="Demo data (database)"
          subtitle="Adds or removes sample clients, enquiries, quotations, invoices, and templates (ids prefixed with sample_). Admin only."
          accent="from-violet-600 to-indigo-900"
        >
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Status:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {demoStatus == null
                ? '…'
                : demoStatus.installed
                  ? `Installed (${demoStatus.version || 'unknown version'})`
                  : 'Not installed'}
            </strong>
          </p>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-500">
            Replace removes existing <code className="text-[11px]">sample_*</code> rows first, then re-inserts fresh demo
            records. Remove deletes only demo rows and clears the marker — your own data is untouched.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={demoBusy}
              onClick={() => {
                void (async () => {
                  setDemoBusy(true)
                  try {
                    const out = await apiSeedDemoData(false)
                    if (!out.ok) {
                      toast.info(out.detail || 'Demo data already present')
                    } else {
                      toast.success('Demo data added')
                      await bootstrapFromApi()
                    }
                    setDemoStatus(await apiDemoDataStatus())
                  } catch (e) {
                    const d = e?.response?.data?.detail
                    toast.error(typeof d === 'string' ? d : e?.message || 'Request failed')
                  } finally {
                    setDemoBusy(false)
                  }
                })()
              }}
            >
              {demoBusy ? 'Working…' : 'Add demo data'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={demoBusy}
              onClick={() => setConfirmReplaceDemo(true)}
            >
              Replace demo data
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={demoBusy || !demoStatus?.installed}
              onClick={() => setConfirmRemoveDemo(true)}
            >
              Remove demo data
            </Button>
          </div>
        </Card>
      ) : null}

      <Card
        title="Brevo (email)"
        subtitle="Transactional email via Brevo API — stored locally with your CRM data"
        accent="from-sky-500 to-indigo-800"
      >
        <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
          Create a key in{' '}
          <a
            className="font-medium text-[var(--color-va-blue)] underline-offset-2 hover:underline"
            href="https://app.brevo.com/settings/keys/api"
            target="_blank"
            rel="noreferrer"
          >
            Brevo → SMTP &amp; API
          </a>
          . Use a verified sender domain or single sender in Brevo. In <code className="text-[11px]">npm run dev</code> the
          Vite dev server proxies sends to avoid browser CORS; for production hosting, set{' '}
          <code className="text-[11px]">VITE_BREVO_PROXY_URL</code> to your own backend route that forwards to Brevo.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">API key</label>
            <Input
              type="password"
              autoComplete="off"
              value={brevoSettings.apiKey}
              onChange={(e) => setBrevoSettings({ apiKey: e.target.value })}
              placeholder="xkeysib-…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Sender email</label>
            <Input
              type="email"
              value={brevoSettings.senderEmail}
              onChange={(e) => setBrevoSettings({ senderEmail: e.target.value })}
              placeholder="noreply@yourdomain.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Sender name</label>
            <Input
              value={brevoSettings.senderName}
              onChange={(e) => setBrevoSettings({ senderName: e.target.value })}
              placeholder="Logistics CRM"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Organisation display name</label>
            <Input
              value={brevoSettings.organizationName}
              onChange={(e) => setBrevoSettings({ organizationName: e.target.value })}
              placeholder="Used in templates as {{senderCompany}}"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Reply-to (optional)</label>
            <Input
              type="email"
              value={brevoSettings.replyToEmail}
              onChange={(e) => setBrevoSettings({ replyToEmail: e.target.value })}
              placeholder="sales@yourdomain.com"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-700 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Send test to</label>
            <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@company.com" />
          </div>
          <Button type="button" variant="primary" disabled={sendingTest} onClick={sendTestNotification}>
            {sendingTest ? 'Sending…' : 'Send test notification'}
          </Button>
        </div>
      </Card>

      <SettingsAppearance />

      <Card
        title={t('settings.i18n.title')}
        subtitle={t('settings.i18n.subtitle')}
        accent="from-teal-500 to-slate-800"
      >
        <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">{t('settings.i18n.hint')}</p>
        <div className="mb-6">
          <label
            htmlFor="settings-display-locale"
            className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            {t('settings.i18n.display')}
          </label>
          <select
            id="settings-display-locale"
            value={locale}
            onChange={(e) => setI18nLocale(e.target.value)}
            className="w-full max-w-md rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {I18N_LANGUAGES.filter((l) => enabledLocales.includes(l.code)).map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} ({l.name})
              </option>
            ))}
          </select>
        </div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('settings.i18n.enabled')}
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {I18N_LANGUAGES.map((l) => {
            const checked = enabledLocales.includes(l.code)
            const onlyOne = enabledLocales.length <= 1
            return (
              <li key={l.code} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`i18n-lang-${l.code}`}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--color-va-blue)] focus:ring-[var(--color-va-blue)]"
                  checked={checked}
                  disabled={checked && onlyOne}
                  onChange={(e) => {
                    const on = e.target.checked
                    if (!on && onlyOne) {
                      toast.error(t('settings.i18n.mustKeepOne'))
                      return
                    }
                    toggleI18nLocaleEnabled(l.code, on)
                  }}
                />
                <label
                  htmlFor={`i18n-lang-${l.code}`}
                  className="cursor-pointer select-none text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="font-medium">{l.native}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-500">({l.code})</span>
                </label>
              </li>
            )
          })}
        </ul>
      </Card>

      <SettingsCodeConventions />

      <Card title="Local data" subtitle="Clears clients, enquiries, quotations, invoices, users, and session" accent="from-emerald-600 to-blue-700">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Resets the mock database and restores default demo users. This cannot be undone.
        </p>
        <Button type="button" variant="danger" onClick={() => setConfirmClear(true)}>
          Clear all local data
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="Clear everything?"
        message="This removes all CRM records and demo users (reset to defaults), then logs you out. Confirm to continue."
        confirmLabel="Clear all"
        onClose={() => setConfirmClear(false)}
        onConfirm={onClear}
      />

      <ConfirmDialog
        open={confirmReplaceDemo}
        title="Replace demo data?"
        message="This deletes existing sample_* rows and inserts a fresh demo set. Other CRM records are not removed."
        confirmLabel="Replace"
        onClose={() => setConfirmReplaceDemo(false)}
        onConfirm={() => {
          setConfirmReplaceDemo(false)
          void (async () => {
            setDemoBusy(true)
            try {
              await apiSeedDemoData(true)
              toast.success('Demo data replaced')
              await bootstrapFromApi()
              setDemoStatus(await apiDemoDataStatus())
            } catch (e) {
              const d = e?.response?.data?.detail
              toast.error(typeof d === 'string' ? d : e?.message || 'Request failed')
            } finally {
              setDemoBusy(false)
            }
          })()
        }}
      />

      <ConfirmDialog
        open={confirmRemoveDemo}
        title="Remove demo data?"
        message="Deletes all sample_* clients, enquiries, quotations, invoices, and demo email templates from the server. Your own records stay."
        confirmLabel="Remove"
        onClose={() => setConfirmRemoveDemo(false)}
        onConfirm={() => {
          setConfirmRemoveDemo(false)
          void (async () => {
            setDemoBusy(true)
            try {
              await apiRemoveDemoData()
              toast.success('Demo data removed')
              await bootstrapFromApi()
              setDemoStatus(await apiDemoDataStatus())
            } catch (e) {
              const d = e?.response?.data?.detail
              toast.error(typeof d === 'string' ? d : e?.message || 'Request failed')
            } finally {
              setDemoBusy(false)
            }
          })()
        }}
      />
    </div>
  )
}
