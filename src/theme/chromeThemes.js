/** Visual chrome family (fonts, surfaces, accents). Persisted in app store. */
export const CHROME_THEME_FREIGHT_DESK = 'freightDesk'
export const CHROME_THEME_VUESTIC = 'vuestic'

export const CHROME_THEME_OPTIONS = [
  {
    value: CHROME_THEME_FREIGHT_DESK,
    label: 'FreightDesk',
    description: 'IBM Plex typography, monospace form labels, panel-style surfaces (default).',
  },
  {
    value: CHROME_THEME_VUESTIC,
    label: 'Vuestic',
    description: 'Original system fonts and Vuestic Admin–style blue chrome.',
  },
]

export function normalizeChromeTheme(raw) {
  const s = String(raw || '').trim()
  return s === CHROME_THEME_VUESTIC ? CHROME_THEME_VUESTIC : CHROME_THEME_FREIGHT_DESK
}

export function applyChromeThemeToDocument(chromeTheme) {
  if (typeof document === 'undefined') return
  const v = normalizeChromeTheme(chromeTheme)
  document.documentElement.setAttribute('data-chrome', v)
}
