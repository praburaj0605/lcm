const tones = {
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700/80 dark:text-slate-100 dark:border-slate-600',
  yellow: 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700/50',
  blue: 'bg-[var(--color-va-blue-soft)] text-[var(--color-va-blue)] border border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50',
  green: 'bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/50',
  red: 'bg-rose-100 text-rose-900 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700/50',
  violet: 'bg-violet-100 text-violet-900 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800/50',
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-none px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${tones[tone] || tones.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
