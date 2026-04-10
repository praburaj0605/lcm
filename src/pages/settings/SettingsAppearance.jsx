import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { CHROME_THEME_OPTIONS } from '../../theme/chromeThemes'

/**
 * Appearance: chrome family (FreightDesk vs Vuestic) and light/dark mode.
 */
export function SettingsAppearance() {
  const uiTheme = useAppStore((s) => s.uiTheme)
  const setUiTheme = useAppStore((s) => s.setUiTheme)
  const chromeTheme = useAppStore((s) => s.chromeTheme)
  const setChromeTheme = useAppStore((s) => s.setChromeTheme)

  return (
    <Card title="Appearance" subtitle="Chrome theme and light/dark mode — saved with your session" accent="from-amber-400 to-red-600">
      <div className="space-y-8">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Chrome theme</p>
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
            Controls fonts, form label style, and main surface colours across the app. <strong>FreightDesk</strong> is the default;
            <strong> Vuestic</strong> restores the earlier system-font / Vuestic Admin look.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {CHROME_THEME_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={chromeTheme === opt.value ? 'primary' : 'outline'}
                className="!h-auto min-h-0 !flex-col !items-stretch !gap-1 !py-3 !text-left sm:min-w-[200px]"
                onClick={() => setChromeTheme(opt.value)}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="text-xs font-normal opacity-90">{opt.description}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Colour mode</p>
          <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">Light or dark background for pages and navigation.</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant={uiTheme === 'light' ? 'primary' : 'ghost'} onClick={() => setUiTheme('light')}>
              Light
            </Button>
            <Button type="button" variant={uiTheme === 'dark' ? 'primary' : 'ghost'} onClick={() => setUiTheme('dark')}>
              Dark
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
