import { useId, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { FormField } from '../forms/FormField'
import { toast } from 'sonner'
import { addCustomAirport, getMergedCountries } from '../../services/locationRegistry'

/**
 * IATA = International Air Transport Association 3-letter airport code (e.g. MAA, BOM, DXB, LHR).
 * Used worldwide for ticketing, AWB, and schedules — not the same as ICAO (4 letters).
 */
export function AirportCodeInputWithAdd({
  id: idProp,
  value,
  onChange,
  /** { value: iata, label: descriptive } */
  options,
  onRefresh,
  /** Shown under the label */
  hint,
}) {
  const genId = useId()
  const listId = `${idProp || genId}-iata`
  const [open, setOpen] = useState(false)
  const [iata, setIata] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [busy, setBusy] = useState(false)

  const countries = useMemo(() => getMergedCountries(), [open])

  function openAdd() {
    setIata((value || '').toUpperCase().slice(0, 3))
    setName('')
    setCity('')
    setCountryCode('')
    setOpen(true)
  }

  async function save() {
    const cc = String(countryCode || '').trim().toUpperCase()
    const code = String(iata || '').trim().toUpperCase()
    if (!cc || code.length !== 3 || !name.trim()) {
      toast.error('Select country, enter a 3-letter IATA code, and airport name.')
      return
    }
    setBusy(true)
    try {
      const r = addCustomAirport(code, name.trim(), city.trim(), cc)
      if (!r) {
        toast.error('Could not save airport — check country, code, and name.')
        return
      }
      onChange(r.iata)
      onRefresh?.()
      setOpen(false)
      if (r.alreadyExists) toast.success('That code is already in the list — selected.')
      else toast.success('Airport added.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <FormField
        label="Airport code (IATA)"
        htmlFor={idProp}
        hint={
          hint ||
          'Three-letter IATA code (e.g. MAA, BOM, DXB). Narrow the list by setting origin/destination country above; you can always type a code.'
        }
      >
        <div className="flex gap-1.5">
          <Input
            id={idProp}
            className="min-w-0 flex-1 font-mono uppercase"
            list={listId}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
            placeholder="e.g. MAA"
            maxLength={3}
            autoComplete="off"
          />
          <datalist id={listId}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </datalist>
          <Button type="button" variant="outline" className="shrink-0 px-2.5" title="Add airport to list" onClick={openAdd}>
            +
          </Button>
        </div>
      </FormField>

      <Modal open={open} title="Add airport (IATA)" onClose={() => setOpen(false)} wide>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
          IATA publishes standard 3-letter codes for airports. After saving, the code appears in suggestions for that country.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Country (for this airport)</label>
            <Select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
              <option value="">Select country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </div>
          <FormField label="IATA code (3 letters)" htmlFor="iata-new">
            <Input
              id="iata-new"
              className="font-mono uppercase"
              value={iata}
              onChange={(e) => setIata(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
              maxLength={3}
              placeholder="MAA"
            />
          </FormField>
          <FormField label="Airport name" htmlFor="air-name">
            <Input id="air-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chennai International" />
          </FormField>
          <FormField label="City" htmlFor="air-city">
            <Input id="air-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Chennai" />
          </FormField>
          <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="primary"
              disabled={busy || !countryCode || iata.length !== 3 || !name.trim()}
              onClick={save}
            >
              Save airport
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
