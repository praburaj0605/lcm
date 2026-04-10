export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-none bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 ${className}`}
    />
  )
}
