import { MESSAGES } from './messages'
import { I18N_DEFAULT_LOCALE } from './languages'

export function translate(locale, key) {
  const pack = MESSAGES[locale] || MESSAGES[I18N_DEFAULT_LOCALE]
  const fallback = MESSAGES[I18N_DEFAULT_LOCALE]
  return pack[key] ?? fallback[key] ?? key
}
