import { useId, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { FormField } from '../forms/FormField'
import { addCustomAirport, addCustomSeaPort } from '../../services/locationRegistry'

/** Port / airport code with suggestions (IATA + sea UNLOCODE-style) and + to register a new code. */
export function PortCodeInputWithAdd({
  id: idProp,
  label,
  value,
  onChange,
  portOptions,
  countryCode,
  error,
  hint,
  required,
  onRefresh,
  disabled,
  placeholder = 'Code or pick from list',
}) {
  const genId = useId()
  const listId = `${idProp || genId}-ports`
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('sea')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)

  function openAdd() {
    setKind('sea')
    setCode((value || '').toUpperCase())
    setName('')
    setCity('')
    setOpen(true)
  }

  async function savePort() {
    const cc = String(countryCode || '').trim().toUpperCase()
    if (!cc) return
    setBusy(true)
    try {
      let r = null
      if (kind === 'sea') {
        r = addCustomSeaPort(code, name, city, cc)
      } else {
        r = addCustomAirport(code, name, city, cc)
      }
      if (r) {
        onChange(kind === 'sea' ? r.code : r.iata)
        onRefresh?.()
        setOpen(false)
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
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            error={error}
            disabled={disabled}
            placeholder={placeholder}
          />
          <datalist id={listId}>
            {portOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </datalist>
          <Button type="button" variant="outline" className="shrink-0 px-2.5" title="Add port/airport" onClick={openAdd} disabled={disabled}>
            +
          </Button>
        </div>
      </FormField>

      <Modal open={open} title="Add port or airport code" onClose={() => setOpen(false)} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Type</label>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="sea">Sea port (UNLOCODE-style)</option>
              <option value="air">Airport (IATA)</option>
            </Select>
          </div>
          <FormField label={kind === 'sea' ? 'Port code' : 'IATA (3 letters)'} htmlFor="pc-code">
            <Input id="pc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={kind === 'air' ? 3 : 12} />
          </FormField>
          <FormField label="Name" htmlFor="pc-name">
            <Input id="pc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="City" htmlFor="pc-city">
            <Input id="pc-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </FormField>
          <p className="sm:col-span-2 text-xs text-slate-500">Country is taken from the country field ({countryCode || '—'}).</p>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={busy || !countryCode || !code.trim() || !name.trim() || (kind === 'air' && code.trim().length !== 3)}
              onClick={savePort}
            >
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
