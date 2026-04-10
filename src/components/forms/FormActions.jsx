import { Button } from '../ui/Button'

/**
 * Standard form footer: primary submit (pass as child) + Reset + optional Back to list.
 * Place the submit Button as `children` (type="submit" variant="primary").
 */
export function FormActions({
  children,
  onReset,
  resetLabel = 'Reset',
  onCancel,
  cancelLabel = 'Back to list',
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 md:col-span-2">
      {children}
      <Button type="button" variant="ghost" onClick={onReset}>
        {resetLabel}
      </Button>
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  )
}
