/**
 * Ten widely spoken languages (by total speakers / global use).
 * Codes are BCP 47–style (ISO 639-1 + optional region where helpful).
 */
export const I18N_LANGUAGES = Object.freeze([
  { code: 'en', name: 'English', native: 'English' },
  { code: 'zh', name: 'Chinese (Mandarin)', native: '中文' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
])

export const I18N_DEFAULT_LOCALE = 'en'

/** All language codes (for default “enabled” set). */
export const I18N_ALL_CODES = I18N_LANGUAGES.map((l) => l.code)
