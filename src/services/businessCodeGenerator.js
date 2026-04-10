/** @typedef {'enquiry' | 'quotation' | 'invoice'} CodeModuleKey */

export const CODE_MODULE_KEYS = /** @type {const} */ (['enquiry', 'quotation', 'invoice'])

/** @typedef {{ prefix: string, suffix: string, digits: number, appendDate: boolean, datePattern: string, separator: string }} ModuleCodeConvention */

const DEFAULT_BY_MODULE = {
  enquiry: {
    prefix: 'ENQ',
    suffix: '',
    digits: 6,
    appendDate: true,
    datePattern: 'MM/YYYY',
    separator: '-',
  },
  quotation: {
    prefix: 'Q',
    suffix: '',
    digits: 6,
    appendDate: true,
    datePattern: 'MM/YYYY',
    separator: '-',
  },
  invoice: {
    prefix: 'INV',
    suffix: '',
    digits: 6,
    appendDate: true,
    datePattern: 'MM/YYYY',
    separator: '-',
  },
}

export const DATE_PATTERN_OPTIONS = Object.freeze([
  { value: 'MM/YYYY', label: 'Month / year (04/2026)' },
  { value: 'DD/YYYY', label: 'Day / year (22/2026)' },
  { value: 'DD/MM/YYYY', label: 'Day / month / year' },
  { value: 'YYYY-MM', label: 'Year-month (2026-04)' },
  { value: 'YYYY', label: 'Year only (2026)' },
])

const ALLOWED_PATTERNS = new Set(DATE_PATTERN_OPTIONS.map((o) => o.value))

export function defaultCodeConventions() {
  return {
    enquiry: { ...DEFAULT_BY_MODULE.enquiry },
    quotation: { ...DEFAULT_BY_MODULE.quotation },
    invoice: { ...DEFAULT_BY_MODULE.invoice },
  }
}

/**
 * @param {Partial<ModuleCodeConvention> | undefined} raw
 * @param {CodeModuleKey} moduleKey
 * @returns {ModuleCodeConvention}
 */
export function normalizeModuleConvention(raw, moduleKey) {
  const d = DEFAULT_BY_MODULE[moduleKey]
  const sep = String(raw?.separator ?? d.separator).slice(0, 3)
  const pattern = ALLOWED_PATTERNS.has(raw?.datePattern) ? raw.datePattern : d.datePattern
  return {
    prefix: String(raw?.prefix ?? d.prefix),
    suffix: String(raw?.suffix ?? d.suffix),
    digits: Math.min(12, Math.max(1, Number(raw?.digits) || d.digits)),
    appendDate: raw?.appendDate !== false,
    datePattern: pattern,
    separator: sep || '-',
  }
}

/**
 * @param {Date} date
 * @param {string} pattern
 */
export function formatDateSegment(date, pattern) {
  const d = date instanceof Date ? date : new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  switch (pattern) {
    case 'DD/MM/YYYY':
      return `${dd}/${mm}/${yyyy}`
    case 'MM/YYYY':
      return `${mm}/${yyyy}`
    case 'DD/YYYY':
      return `${dd}/${yyyy}`
    case 'YYYY-MM':
      return `${yyyy}-${mm}`
    case 'YYYY':
      return yyyy
    default:
      return `${mm}/${yyyy}`
  }
}

/**
 * @param {CodeModuleKey} moduleKey
 * @param {number} sequence 1-based
 * @param {Record<string, Partial<ModuleCodeConvention>> | undefined} allConventions
 */
export function formatBusinessCode(moduleKey, sequence, allConventions) {
  const conv = normalizeModuleConvention(allConventions?.[moduleKey], moduleKey)
  const padded = String(Math.max(1, Math.floor(sequence))).padStart(conv.digits, '0')
  const sep = conv.separator || '-'
  /** @type {string[]} */
  const parts = []
  if (conv.prefix.trim()) parts.push(conv.prefix.trim())
  parts.push(padded)
  if (conv.appendDate) parts.push(formatDateSegment(new Date(), conv.datePattern))
  if (conv.suffix.trim()) parts.push(conv.suffix.trim())
  return parts.join(sep)
}

/**
 * Next code if we incremented from lastSequence (does not mutate store).
 * @param {CodeModuleKey} moduleKey
 * @param {Record<string, Partial<ModuleCodeConvention>> | undefined} allConventions
 * @param {number} lastSequence
 */
export function previewNextBusinessCode(moduleKey, allConventions, lastSequence) {
  const next = (Number(lastSequence) || 0) + 1
  return formatBusinessCode(moduleKey, next, allConventions)
}
