/**
 * Icon-only control for table row actions. Colors match action semantics.
 * @param {'view' | 'edit' | 'delete' | 'pricing' | 'assign'} action
 */
const actionStyles = {
  view:
    'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  edit:
    'border-[var(--color-va-blue)] bg-[var(--color-va-blue-soft)] text-[var(--color-va-blue)] hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950',
  delete:
    'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70',
  pricing:
    'border-violet-400 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-200 dark:hover:bg-violet-950/80',
  assign:
    'border-teal-400 bg-teal-50 text-teal-900 hover:bg-teal-100 dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200 dark:hover:bg-teal-950/80',
}

const base =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40'

export function IconButton({ action = 'view', title, className = '', type = 'button', disabled, onClick, children }) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${actionStyles[action] || actionStyles.view} ${className}`}
    >
      {children}
    </button>
  )
}
