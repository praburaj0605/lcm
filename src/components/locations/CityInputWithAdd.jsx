import { useId, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { FormField } from '../forms/FormField'

/** Text input with datalist suggestions and + to save a new city for this country. */
export function CityInputWithAdd({
  id: idProp,
  label,
  value,
  onChange,
  suggestions,
  error,
  hint,
  required,
  onAddCustom,
  disabled,
  placeholder = 'City',
}) {
  const genId = useId()
  const listId = `${idProp || genId}-cities`
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveAdd() {
    if (!onAddCustom || !draft.trim()) return
    setBusy(true)
    try {
      const ok = await onAddCustom(draft.trim())
      if (ok !== false) {
        onChange(draft.trim())
        setOpen(false)
        setDraft('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <FormField label={label} htmlFor={idProp} error={error} hint={hint} required={required}>
        <div className="flex gap-1.5">
          <Input
            id={idProp}
            className="min-w-0 flex-1"
            list={listId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            disabled={disabled}
            placeholder={placeholder}
          />
          <datalist id={listId}>
            {suggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {onAddCustom ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 px-2.5"
              title="Add city"
              onClick={() => {
                setDraft(value || '')
                setOpen(true)
              }}
              disabled={disabled}
            >
              +
            </Button>
          ) : null}
        </div>
      </FormField>

      {onAddCustom ? (
        <Modal open={open} title="Add city" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="City name" autoFocus />
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
