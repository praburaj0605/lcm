import { forwardRef } from 'react'

export const Textarea = forwardRef(function Textarea(
  { className = '', error, id, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      className={`w-full rounded-none border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 hover:border-[var(--color-va-blue)]/50 focus:border-[var(--color-va-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--color-va-blue)]/20 dark:bg-[#1a1d2e] dark:text-slate-100 dark:border-slate-600 ${
        error ? 'border-rose-500' : 'border-slate-200 dark:border-slate-600'
      } ${className}`}
      {...props}
    />
  )
})
