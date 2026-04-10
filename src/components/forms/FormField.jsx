export function FormField({ label, htmlFor, error, hint, children, required }) {
  return (
    <div className="space-y-1">
      {label ? (
        <label
          htmlFor={htmlFor}
          className="app-form-label block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="text-xs text-slate-500 dark:text-slate-500">{hint}</p>
      ) : null}
      {error ? <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
