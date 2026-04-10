import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { FormField } from '../../components/forms/FormField'
import { FormActions } from '../../components/forms/FormActions'
import { Card } from '../../components/ui/Card'
import { LocationSelectWithAdd } from '../../components/locations/LocationSelectWithAdd'
import { CityInputWithAdd } from '../../components/locations/CityInputWithAdd'
import { useLocationRegistry } from '../../hooks/useLocationRegistry'
import {
  addCustomCity,
  addCustomCountry,
  addCustomState,
  getMergedCitiesForCountry,
  getMergedCountries,
  getMergedStatesForCountry,
} from '../../services/locationRegistry'
import { validateClient, cloneForm } from './clientShared'

export function ClientForm({
  defaultValues,
  onSubmitRecord,
  submitLabel,
  title,
  subtitle,
  accent,
  listPath = '/clients',
}) {
  const navigate = useNavigate()
  const snapshotRef = useRef(cloneForm(defaultValues))
  const [form, setForm] = useState(() => cloneForm(defaultValues))
  const [errors, setErrors] = useState({})
  const { refresh, version } = useLocationRegistry()
  const countries = useMemo(() => getMergedCountries(), [version])
  const countryOptions = useMemo(() => {
    const base = countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))
    if (form.country && !base.some((o) => o.value === form.country)) {
      return [{ value: form.country, label: `${form.country} (saved)` }, ...base]
    }
    return base
  }, [countries, form.country])
  const stateOptions = useMemo(() => {
    const base = getMergedStatesForCountry(form.country).map((s) => ({ value: s.name, label: s.name }))
    if (form.state && !base.some((o) => o.value === form.state)) {
      return [{ value: form.state, label: `${form.state} (saved)` }, ...base]
    }
    return base
  }, [form.country, form.state, version])
  const citySuggestions = useMemo(() => getMergedCitiesForCountry(form.country), [form.country, version])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setCountry(v) {
    setForm((f) => {
      if (f.country === v) return { ...f, country: v }
      return { ...f, country: v, state: '', city: '' }
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const v = validateClient(form)
    setErrors(v)
    if (Object.keys(v).length) return
    onSubmitRecord(form)
  }

  function reset() {
    setForm(cloneForm(snapshotRef.current))
    setErrors({})
  }

  return (
    <Card title={title} subtitle={subtitle} accent={accent}>
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <FormField label="Client name" htmlFor="clientName" error={errors.clientName} required>
          <Input id="clientName" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} error={errors.clientName} />
        </FormField>
        <FormField label="Company name" htmlFor="companyName" error={errors.companyName}>
          <Input id="companyName" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} />
        </FormField>
        <div className="md:col-span-2 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="min-w-[200px] flex-1 space-y-1">
            <label htmlFor="logoUrl" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Logo URL
            </label>
            <Input
              id="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setField('logoUrl', e.target.value)}
              placeholder="https://… (SVG/PNG)"
            />
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <label htmlFor="logoAlt" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Logo alt text
            </label>
            <Input id="logoAlt" value={form.logoAlt} onChange={(e) => setField('logoAlt', e.target.value)} />
          </div>
          {form.logoUrl?.trim() ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Preview</span>
              <img
                src={form.logoUrl.trim()}
                alt={form.logoAlt?.trim() || ''}
                className="h-14 w-14 border border-slate-200 bg-white object-contain dark:border-slate-600 dark:bg-slate-900"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
        </div>
        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <Input id="email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} />
        </FormField>
        <FormField label="Phone" htmlFor="phone" error={errors.phone} required>
          <Input id="phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} error={errors.phone} />
        </FormField>
        <FormField label="Alternate phone" htmlFor="alternatePhone">
          <Input id="alternatePhone" value={form.alternatePhone} onChange={(e) => setField('alternatePhone', e.target.value)} />
        </FormField>
        <LocationSelectWithAdd
          id="country"
          label="Country"
          value={form.country}
          onChange={setCountry}
          options={countryOptions}
          placeholder="Select country…"
          addTitle="Add country"
          addInputLabel="Country name"
          onAddCustom={async (name) => {
            const r = addCustomCountry(name)
            if (!r) return false
            refresh()
            setForm((f) => ({ ...f, country: r.code, state: '', city: '' }))
            return true
          }}
        />
        <LocationSelectWithAdd
          id="state"
          label="State / province"
          value={form.state}
          onChange={(v) => setField('state', v)}
          options={stateOptions}
          placeholder={form.country ? 'Select state…' : 'Select country first'}
          addTitle="Add state / province"
          addInputLabel="State or province name"
          disabled={!form.country}
          onAddCustom={
            form.country
              ? async (name) => {
                  const r = addCustomState(form.country, name)
                  if (!r) return false
                  refresh()
                  setField('state', r.name)
                  return true
                }
              : undefined
          }
        />
        <CityInputWithAdd
          id="city"
          label="City"
          value={form.city}
          onChange={(v) => setField('city', v)}
          suggestions={citySuggestions}
          disabled={!form.country}
          onAddCustom={
            form.country
              ? async (cityName) => {
                  const r = addCustomCity(form.country, cityName)
                  if (!r) return false
                  refresh()
                  setField('city', cityName)
                  return true
                }
              : undefined
          }
        />
        <FormField label="GST / Tax ID" htmlFor="gstTaxId">
          <Input id="gstTaxId" value={form.gstTaxId} onChange={(e) => setField('gstTaxId', e.target.value)} />
        </FormField>
        <FormField label="Industry" htmlFor="industry">
          <Input id="industry" value={form.industry} onChange={(e) => setField('industry', e.target.value)} />
        </FormField>
        <FormField label="Contact person name" htmlFor="contactPersonName">
          <Input id="contactPersonName" value={form.contactPersonName} onChange={(e) => setField('contactPersonName', e.target.value)} />
        </FormField>
        <FormField label="Contact person role" htmlFor="contactPersonRole">
          <Input id="contactPersonRole" value={form.contactPersonRole} onChange={(e) => setField('contactPersonRole', e.target.value)} />
        </FormField>
        <FormField label="Contact person email" htmlFor="contactPersonEmail">
          <Input id="contactPersonEmail" type="email" value={form.contactPersonEmail} onChange={(e) => setField('contactPersonEmail', e.target.value)} />
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Select id="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Address" htmlFor="address">
            <Textarea id="address" rows={3} value={form.address} onChange={(e) => setField('address', e.target.value)} />
          </FormField>
        </div>
        <div className="md:col-span-2">
          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </FormField>
        </div>
        <FormActions onReset={reset} onCancel={() => navigate(listPath)}>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </Card>
  )
}
