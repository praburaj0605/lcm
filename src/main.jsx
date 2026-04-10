import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import { bindApiAuth } from './services/apiClient'
import { useAppStore } from './store/useAppStore'
import { STORAGE_KEY } from './services/storageService'
import {
  applyChromeThemeToDocument,
  CHROME_THEME_FREIGHT_DESK,
  normalizeChromeTheme,
} from './theme/chromeThemes'

/** Apply theme from persisted zustand blob before first paint (reduces flash). */
function bootstrapDocumentThemeFromStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      applyChromeThemeToDocument(CHROME_THEME_FREIGHT_DESK)
      return
    }
    const parsed = JSON.parse(raw)
    const st = parsed?.state
    if (st?.uiTheme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    applyChromeThemeToDocument(normalizeChromeTheme(st?.chromeTheme))
  } catch {
    applyChromeThemeToDocument(CHROME_THEME_FREIGHT_DESK)
  }
}

bootstrapDocumentThemeFromStorage()

bindApiAuth({
  getToken: () => useAppStore.getState().auth?.token,
  onUnauthorized: () => useAppStore.getState().logout(),
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
        <Toaster richColors position="top-right" closeButton />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)
