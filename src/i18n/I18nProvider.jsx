import { createContext, useCallback, useContext, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translate } from './translate'

const I18nContext = createContext({
  locale: 'en',
  t: (key) => key,
})

export function I18nProvider({ children }) {
  const locale = useAppStore((s) => s.locale)
  const t = useCallback((key) => translate(locale, key), [locale])
  const value = useMemo(() => ({ locale, t }), [locale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
