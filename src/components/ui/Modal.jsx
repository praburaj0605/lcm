import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './Button'

export function Modal({ open, title, children, onClose, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="no-print absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-none border border-slate-200/90 bg-white p-6 shadow-[0_24px_48px_rgba(38,44,73,0.12)] dark:border-slate-700 dark:bg-[#1e2130] ${
              wide ? 'max-w-4xl' : 'max-w-lg'
            }`}
          >
            <div className="no-print mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
              <Button type="button" variant="ghost" className="!px-2 !py-1" onClick={onClose}>
                ✕
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
