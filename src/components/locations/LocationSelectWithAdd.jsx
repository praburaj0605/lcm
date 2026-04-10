import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { FormField } from '../forms/FormField'

/**
 * Select with options plus “+” to append a custom entry (persisted via parent onAddCustom).
 */
export function LocationSelectWithAdd({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  error,
  hint,
  required,
  addTitle,
  addInputLabel = 'Name',
  onAddCustom,
  disabled,
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveAdd() {
    if (!onAddCustom || !draft.trim()) return
    setBusy(true)
    try {
      const ok = await onAddCustom(draft.trim())
      if (ok !== false) {
        setOpen(false)
        setDraft('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <FormField label={label} htmlFor={id} error={error} hint={hint} required={required}>
        <div className="flex gap-1.5">
          <Select
            id={id}
            className="min-w-0 flex-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            disabled={disabled}
          >
            <option value="">{placeholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {onAddCustom ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 px-2.5"
              title={addTitle || 'Add custom'}
              onClick={() => setOpen(true)}
              disabled={disabled}
            >
              +
            </Button>
          ) : null}
        </div>
      </FormField>

      {onAddCustom ? (
        <Modal open={open} title={addTitle || 'Add entry'} onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{addInputLabel}</label>
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={addInputLabel} autoFocus />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" disabled={busy || !draft.trim()} onClick={saveAdd}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
