import { motion } from 'framer-motion'

/** Freight-style cards: light surfaces in light theme, FreightDesk-dark in dark theme. */
const freightTone =
  'border-slate-200/90 bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-[#2a2f3d] dark:bg-[#13161b] dark:text-[#f0f2f7] dark:shadow-none'

/** @param {{ title?: string, subtitle?: string, children?: import('react').ReactNode, className?: string, accent?: string, flush?: boolean, tone?: 'default' | 'freight' }} props */
export function Card({ title, subtitle, children, className = '', accent, flush, tone = 'default' }) {
  const base =
    tone === 'freight'
      ? `overflow-hidden rounded-none border ${freightTone} ${className}`
      : `overflow-hidden rounded-none border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:border-slate-700/80 dark:bg-[#1e2130] dark:shadow-none ${className}`
  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={base}
    >
      {accent ? (
        <div className={`h-1 bg-gradient-to-r ${accent}`} aria-hidden />
      ) : (
        <div
          className="h-px bg-gradient-to-r from-transparent via-[var(--color-va-blue)]/25 to-transparent dark:via-blue-500/35"
          aria-hidden
        />
      )}
      <div className={flush ? '' : 'p-6'}>
        {title ? (
          <div className="mb-4">
            <h3
              className={
                tone === 'freight'
                  ? 'text-lg font-semibold tracking-tight text-slate-900 dark:text-[#f0f2f7]'
                  : 'text-lg font-semibold tracking-tight text-slate-900 dark:text-white'
              }
            >
              {title}
            </h3>
            {subtitle ? (
              <p
                className={
                  tone === 'freight'
                    ? 'mt-1 text-sm text-slate-600 dark:text-[#8891a8]'
                    : 'mt-1 text-sm text-slate-500 dark:text-slate-400'
                }
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </motion.div>
  )
}
