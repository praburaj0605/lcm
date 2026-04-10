import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

/**
 * Semantic variants:
 * - primary — main positive action (submit, save, create)
 * - outline — secondary positive (edit, optional affirmations); blue border
 * - neutral — informational / safe (view, read-only)
 * - danger — destructive (delete, remove, clear)
 * - ghost — cancel / low emphasis
 * - warning — caution (rare; amber)
 * - success — additive “go” in green context (e.g. line items) — kept for accessibility contrast
 * - sidebar — layout nav
 *
 * Pass `to` to render a React Router <Link> with the same styles (no nested <button>).
 */
const variants = {
  primary:
    'bg-[var(--color-va-blue)] text-white hover:bg-[var(--color-va-blue-hover)] active:bg-blue-900 border border-[var(--color-va-blue-hover)] shadow-sm',
  outline:
    'bg-transparent border-2 border-[var(--color-va-blue)] text-[var(--color-va-blue)] dark:text-blue-400 hover:bg-[var(--color-va-blue-soft)] dark:hover:bg-blue-950/40',
  neutral:
    'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border border-rose-700 shadow-sm',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 border border-emerald-700 shadow-sm',
  warning:
    'bg-amber-400 text-amber-950 hover:bg-amber-500 active:bg-amber-600 border border-amber-500 shadow-sm',
  ghost:
    'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200',
  sidebar:
    'w-full rounded-none border-l-[3px] border-transparent bg-transparent text-left text-slate-600 hover:bg-[var(--color-va-sidebar-hover)] hover:text-slate-900',
}

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-none px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none'

export const Button = forwardRef(function Button(
  { className = '', variant = 'primary', type = 'button', disabled, to, ...props },
  ref,
) {
  const cls = `${baseClass} ${variants[variant] || variants.primary} ${className}`
  if (to) {
    return <Link ref={ref} to={to} className={cls} {...props} />
  }
  return (
    <button ref={ref} type={type} disabled={disabled} className={cls} {...props} />
  )
})
