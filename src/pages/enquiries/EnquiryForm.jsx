import { useMemo, useRef, useState, useEffect } from 'react'
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
import { PortCodeInputWithAdd } from '../../components/locations/PortCodeInputWithAdd'
import { AirportCodeInputWithAdd } from '../../components/locations/AirportCodeInputWithAdd'
import { useLocationRegistry } from '../../hooks/useLocationRegistry'
import {
  addCustomCity,
  addCustomCountry,
  addCustomState,
  getAirportSelectOptions,
  getMergedCountries,
  getMergedCitiesForCountry,
  getMergedStatesForCountry,
  getPortCodeOptions,
} from '../../services/locationRegistry'
import { useAppStore } from '../../store/useAppStore'
import {
  validateEnquiry,
  buildEnquiryPayload,
  cloneForm,
  emptyLineItem,
  SERVICE_TYPES,
  SHIPMENT_TYPES,
  CUSTOMER_TYPES,
  PICKUP_DELIVERY_TYPES,
  INCOTERMS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  SOURCE_OPTIONS,
  modeOptionsForService,
  SEA_CONTAINER_TYPES,
  inferEnquiryTemplate,
} from './enquiryShared'
import {
  ENQUIRY_TEMPLATE_OPTIONS,
  getServiceShipmentForTemplate,
  getTemplateUi,
  SALES_CHANNEL_OPTIONS,
} from './enquiryTemplateConfig'
import { EnquiryCargoDetailsCard } from './EnquiryCargoDetailsCard'

export function EnquiryForm({
  defaultValues,
  /** Controlled enquiry state (used with FreightDesk create flow). */
  form: controlledForm,
  setForm: controlledSetForm,
  /** When controlled, called from Reset to restore initial blank enquiry. */
  onControlledReset,
  /** `freight` applies FreightDesk card styling and form chrome hooks. */
  skin = 'default',
  showPageHeader = true,
  onSubmitRecord,
  submitLabel,
  title,
  subtitle,
  accent,
  listPath = '/enquiries',
}) {
  const navigate = useNavigate()
  const clients = useAppStore((s) => s.clients)
  const users = useAppStore((s) => s.users)
  const isControlled = controlledForm != null && controlledSetForm != null
  const salesOwnerUsers = useMemo(
    () =>
      [...users]
        .filter((u) => u.role === 'sales' || u.role === 'admin' || u.role === 'boss')
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [users],
  )
  const pricingUsers = useMemo(() => users.filter((u) => u.role === 'pricing'), [users])
  const { refresh, version } = useLocationRegistry()
  const countries = useMemo(() => getMergedCountries(), [version])
  const snapshotRef = useRef(cloneForm(defaultValues))
  const [internalForm, setInternalForm] = useState(() => cloneForm(defaultValues))
  const form = isControlled ? controlledForm : internalForm
  const setForm = isControlled ? controlledSetForm : setInternalForm
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!isControlled) snapshotRef.current = cloneForm(defaultValues)
  }, [defaultValues, isControlled])

  const modeOpts = useMemo(() => modeOptionsForService(form.serviceType), [form.serviceType])
  const templateUi = useMemo(() => getTemplateUi(form.enquiryTemplate || 'others'), [form.enquiryTemplate])
  const showAir = form.serviceType === 'air' || form.serviceType === 'multimodal'
  const showSea = form.serviceType === 'sea' || form.serviceType === 'multimodal'
  const showRoad = form.serviceType === 'road' || form.serviceType === 'multimodal'

  const countryOptions = useMemo(() => {
    const base = countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))
    const extra = new Set()
    if (form.originCountry && !base.some((o) => o.value === form.originCountry)) extra.add(form.originCountry)
    if (form.destCountry && !base.some((o) => o.value === form.destCountry)) extra.add(form.destCountry)
    const prepend = [...extra].map((v) => ({ value: v, label: `${v} (saved)` }))
    return [...prepend, ...base]
  }, [countries, form.originCountry, form.destCountry])

  const originStateOptions = useMemo(() => {
    const base = getMergedStatesForCountry(form.originCountry).map((s) => ({ value: s.name, label: s.name }))
    if (form.originState && !base.some((o) => o.value === form.originState)) {
      return [{ value: form.originState, label: `${form.originState} (saved)` }, ...base]
    }
    return base
  }, [form.originCountry, form.originState, version])
  const destStateOptions = useMemo(() => {
    const base = getMergedStatesForCountry(form.destCountry).map((s) => ({ value: s.name, label: s.name }))
    if (form.destState && !base.some((o) => o.value === form.destState)) {
      return [{ value: form.destState, label: `${form.destState} (saved)` }, ...base]
    }
    return base
  }, [form.destCountry, form.destState, version])

  const originCitySuggestions = useMemo(
    () => getMergedCitiesForCountry(form.originCountry),
    [form.originCountry, version],
  )
  const destCitySuggestions = useMemo(
    () => getMergedCitiesForCountry(form.destCountry),
    [form.destCountry, version],
  )

  const originPortOpts = useMemo(() => {
    const base = getPortCodeOptions(form.originCountry, form.serviceType)
    if (form.originPortCode && !base.some((o) => o.value === form.originPortCode)) {
      return [{ value: form.originPortCode, label: `${form.originPortCode} (saved)`, kind: 'custom' }, ...base]
    }
    return base
  }, [form.originCountry, form.originPortCode, form.serviceType, version])
  const destPortOpts = useMemo(() => {
    const base = getPortCodeOptions(form.destCountry, form.serviceType)
    if (form.destPortCode && !base.some((o) => o.value === form.destPortCode)) {
      return [{ value: form.destPortCode, label: `${form.destPortCode} (saved)`, kind: 'custom' }, ...base]
    }
    return base
  }, [form.destCountry, form.destPortCode, form.serviceType, version])

  const airIataOpts = useMemo(() => {
    const cc = form.originCountry || form.destCountry
    const base = getAirportSelectOptions(cc)
    if (form.airIataCode && !base.some((o) => o.value === form.airIataCode)) {
      return [{ value: form.airIataCode, label: `${form.airIataCode} (saved)`, kind: 'custom' }, ...base]
    }
    return base
  }, [form.originCountry, form.destCountry, form.airIataCode, version])

  const seaContainerOptions = useMemo(() => {
    const v = form.seaContainerType
    if (v && !SEA_CONTAINER_TYPES.some((t) => t.value === v)) {
      return [{ value: v, label: `${v} (saved)` }, ...SEA_CONTAINER_TYPES]
    }
    return SEA_CONTAINER_TYPES
  }, [form.seaContainerType])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setEnquiryTemplate(templateId) {
    const { serviceType, shipmentType } = getServiceShipmentForTemplate(templateId)
    setForm((f) => {
      const opts = modeOptionsForService(serviceType)
      let nextMode = f.modeType
      if (!opts.includes(nextMode)) nextMode = opts[0] || ''
      let seaLoadType = f.seaLoadType
      if (serviceType === 'sea' && nextMode === 'Break-bulk') seaLoadType = 'Break-bulk'
      else if (seaLoadType === 'Break-bulk' && nextMode !== 'Break-bulk') seaLoadType = 'FCL'
      return {
        ...f,
        enquiryTemplate: templateId,
        serviceType,
        shipmentType,
        modeType: nextMode,
        seaLoadType,
        currency: templateId === 'others' ? f.currency : 'USD',
      }
    })
  }

  function setServiceType(v) {
    setForm((f) => {
      const opts = modeOptionsForService(v)
      const nextMode = opts.includes(f.modeType) ? f.modeType : opts[0] || ''
      let seaLoadType = f.seaLoadType
      if ((v === 'sea' || v === 'multimodal') && nextMode === 'Break-bulk') seaLoadType = 'Break-bulk'
      else if (seaLoadType === 'Break-bulk' && nextMode !== 'Break-bulk') seaLoadType = 'FCL'
      const next = { ...f, serviceType: v, modeType: nextMode, seaLoadType }
      return { ...next, enquiryTemplate: inferEnquiryTemplate(v, next.shipmentType) }
    })
  }

  function setShipmentType(v) {
    setForm((f) => {
      const next = { ...f, shipmentType: v }
      return { ...next, enquiryTemplate: inferEnquiryTemplate(next.serviceType, v) }
    })
  }

  function setModeType(v) {
    setForm((f) => {
      let seaLoadType = f.seaLoadType
      const seaish = f.serviceType === 'sea' || f.serviceType === 'multimodal'
      if (seaish) {
        if (v === 'Break-bulk') seaLoadType = 'Break-bulk'
        else if (v === 'LCL') seaLoadType = 'LCL'
        else if (v === 'FCL') seaLoadType = 'FCL'
        else if (seaLoadType === 'Break-bulk') seaLoadType = 'FCL'
      }
      return { ...f, modeType: v, seaLoadType }
    })
  }

  function setOriginCountry(v) {
    setForm((f) => {
      if (f.originCountry === v) return { ...f, originCountry: v }
      return { ...f, originCountry: v, originState: '', originCity: '', originPortCode: '' }
    })
  }

  function setDestCountry(v) {
    setForm((f) => {
      if (f.destCountry === v) return { ...f, destCountry: v }
      return { ...f, destCountry: v, destState: '', destCity: '', destPortCode: '' }
    })
  }

  function onClientChange(clientId) {
    setForm((f) => {
      const next = { ...f, clientId }
      if (!clientId) return next
      const c = clients.find((x) => x.id === clientId)
      if (!c) return next
      return {
        ...next,
        customerCompanyName: f.customerCompanyName || c.companyName || c.clientName || '',
        contactPerson: f.contactPerson || c.contactPersonName || '',
        contactEmail: f.contactEmail || c.email || '',
        contactPhone: f.contactPhone || c.phone || '',
        gstTaxId: f.gstTaxId || c.gstTaxId || '',
      }
    })
  }

  function setLine(i, key, value) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)),
    }))
  }

  function addLine() {
    setForm((f) => ({ ...f, lineItems: [...(f.lineItems || []), emptyLineItem()] }))
  }

  function toggleLinePricingUser(lineIndex, uid) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li, idx) => {
        if (idx !== lineIndex) return li
        const cur = new Set(li.assignedPricingUserIds || [])
        if (cur.has(uid)) cur.delete(uid)
        else cur.add(uid)
        return { ...li, assignedPricingUserIds: [...cur] }
      }),
    }))
  }

  function applyEnquiryAssigneesToAllLines() {
    setForm((f) => ({
      ...f,
      lineItems: (f.lineItems || []).map((li) => ({
        ...li,
        assignedPricingUserIds: [...(f.assignedPricingUserIds || [])],
      })),
    }))
  }

  function removeLine(i) {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.length > 1 ? f.lineItems.filter((_, idx) => idx !== i) : f.lineItems,
    }))
  }

  function togglePricingUser(uid) {
    setForm((f) => {
      const cur = new Set(f.assignedPricingUserIds || [])
      if (cur.has(uid)) cur.delete(uid)
      else cur.add(uid)
      return { ...f, assignedPricingUserIds: [...cur] }
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const v = validateEnquiry(form)
    setErrors(v)
    if (Object.keys(v).length) return
    onSubmitRecord(buildEnquiryPayload(form))
  }

  function reset() {
    if (isControlled && onControlledReset) {
      onControlledReset()
      setErrors({})
      return
    }
    setInternalForm(cloneForm(snapshotRef.current))
    setErrors({})
  }

  const sectionAccent = 'from-[var(--color-va-blue)] to-slate-700'
  const fdCardTone = skin === 'freight' ? 'freight' : undefined
  const rootClass = 'space-y-6'
  /** FreightDesk create page: route/flow + cargo lines live in §4; hide duplicated §1 / §4 / §5 controls here. */
  const freightUi = skin === 'freight'

  return (
    <div className={rootClass}>
      {showPageHeader ? (
        <div className="border-b border-slate-200 pb-5 dark:border-slate-700">
          <div className={`h-1 w-24 bg-gradient-to-r ${accent || 'from-[var(--color-va-blue)] to-slate-600'} rounded-none`} aria-hidden />
          <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p> : null}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Use <code className="text-[11px]">enquiryId</code> as the business foreign key to quotations, bookings, shipment tracking, and invoices.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {freightUi && errors.commodityDescription ? (
          <div
            className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            {errors.commodityDescription}
          </div>
        ) : null}
        <Card tone={fdCardTone} title="1. Inquiry Master (Basic Details)" subtitle="Top-level record" accent={sectionAccent}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Enquiry template" htmlFor="enquiryTemplate" hint="Matches Excel layouts; sets service and shipment defaults.">
              <Select
                id="enquiryTemplate"
                value={form.enquiryTemplate || 'others'}
                onChange={(e) => setEnquiryTemplate(e.target.value)}
              >
                {ENQUIRY_TEMPLATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="hidden md:block" aria-hidden />
            <FormField label={templateUi.enquiryRefLabel} htmlFor="enquiryId" hint="Stored as enquiryId — use everywhere as FK">
              <Input id="enquiryId" value={form.enquiryId} onChange={(e) => setField('enquiryId', e.target.value)} />
            </FormField>
            <FormField label={templateUi.enquiryDateLabel} htmlFor="inquiryDate">
              <Input id="inquiryDate" type="date" value={form.inquiryDate} onChange={(e) => setField('inquiryDate', e.target.value)} />
            </FormField>
            {templateUi.incotermsFirst ? (
              <FormField label="Incoterms" htmlFor="incoterms">
                <Select id="incoterms" value={form.incoterms} onChange={(e) => setField('incoterms', e.target.value)}>
                  <option value="">Select…</option>
                  {INCOTERMS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}
            {templateUi.incotermsFirst ? <div className="hidden md:block" aria-hidden /> : null}
            {!freightUi ? (
              <>
                <FormField label="Service type" htmlFor="serviceType">
                  <Select id="serviceType" value={form.serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    {SERVICE_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Shipment type" htmlFor="shipmentType">
                  <Select id="shipmentType" value={form.shipmentType} onChange={(e) => setShipmentType(e.target.value)}>
                    {SHIPMENT_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Mode / load type" htmlFor="modeType" hint={templateUi.modeTypeHint}>
                  <Select id="modeType" value={form.modeType} onChange={(e) => setModeType(e.target.value)}>
                    <option value="">Select…</option>
                    {modeOpts.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            ) : (
              <p className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                Service, shipment, and load type are set in <span className="font-medium text-slate-700 dark:text-slate-300">section 2 — Cargo details</span> below.
              </p>
            )}
            {!templateUi.incotermsFirst ? (
              <FormField label="Incoterms" htmlFor="incoterms">
                <Select id="incoterms" value={form.incoterms} onChange={(e) => setField('incoterms', e.target.value)}>
                  <option value="">Select…</option>
                  {INCOTERMS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}
            <FormField label="Sales channel" htmlFor="salesChannel" hint="Excel sample: Sales / Corporate">
              <Select id="salesChannel" value={form.salesChannel || ''} onChange={(e) => setField('salesChannel', e.target.value)}>
                {SALES_CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value || 'none'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Priority / urgency" htmlFor="priority">
              <Select id="priority" value={form.priority} onChange={(e) => setField('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select id="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Lead source" htmlFor="source">
              <Select id="source" value={form.source} onChange={(e) => setField('source', e.target.value)}>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </Card>

        {freightUi ? (
          <EnquiryCargoDetailsCard
            sectionNum={2}
            freightUi
            form={form}
            setForm={setForm}
            errors={errors}
            templateUi={templateUi}
            fdCardTone={fdCardTone}
            sectionAccent={sectionAccent}
            setField={setField}
          />
        ) : null}

        <Card
          tone={fdCardTone}
          title={`${freightUi ? '3' : '2'}. Customer & contact`}
          subtitle="Company and tax details"
          accent={sectionAccent}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="CRM client (required)" htmlFor="clientId" error={errors.clientId} required>
              <Select
                id="clientId"
                value={form.clientId}
                onChange={(e) => onClientChange(e.target.value)}
                error={errors.clientId}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName || c.clientName}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Customer name (company)" htmlFor="customerCompanyName">
              <Input
                id="customerCompanyName"
                value={form.customerCompanyName}
                onChange={(e) => setField('customerCompanyName', e.target.value)}
              />
            </FormField>
            <FormField label="Contact person" htmlFor="contactPerson">
              <Input id="contactPerson" value={form.contactPerson} onChange={(e) => setField('contactPerson', e.target.value)} />
            </FormField>
            <FormField label="Email" htmlFor="contactEmail">
              <Input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField('contactEmail', e.target.value)}
              />
            </FormField>
            <FormField label="Phone" htmlFor="contactPhone">
              <Input id="contactPhone" value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} />
            </FormField>
            <FormField label="GST / Tax ID" htmlFor="gstTaxId">
              <Input id="gstTaxId" value={form.gstTaxId} onChange={(e) => setField('gstTaxId', e.target.value)} />
            </FormField>
            <FormField label="Customer type" htmlFor="customerType">
              <Select id="customerType" value={form.customerType} onChange={(e) => setField('customerType', e.target.value)}>
                {CUSTOMER_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          {clients.length === 0 ? (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">No clients yet — create a client first.</p>
          ) : null}
        </Card>

        <Card
          tone={fdCardTone}
          title={`${freightUi ? '4' : '3'}. Origin & destination`}
          subtitle="Country → state → city; port codes from JSON + your additions"
          accent={sectionAccent}
        >
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <p
              className={
                freightUi
                  ? 'fd-section-title md:col-span-2 !mb-3 border-0 pb-0'
                  : 'md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'
              }
            >
              Origin
            </p>
            <LocationSelectWithAdd
              id="originCountry"
              label="Country"
              value={form.originCountry}
              onChange={setOriginCountry}
              options={countryOptions}
              placeholder="Select country…"
              addTitle="Add country"
              addInputLabel="Country name"
              onAddCustom={async (name) => {
                const r = addCustomCountry(name)
                if (!r) return false
                refresh()
                setForm((f) => ({
                  ...f,
                  originCountry: r.code,
                  originState: '',
                  originCity: '',
                  originPortCode: '',
                }))
                return true
              }}
            />
            <LocationSelectWithAdd
              id="originState"
              label="State / province"
              value={form.originState}
              onChange={(v) => setField('originState', v)}
              options={originStateOptions}
              placeholder={form.originCountry ? 'Select state…' : 'Select country first'}
              addTitle="Add state / province"
              addInputLabel="State or province name"
              disabled={!form.originCountry}
              onAddCustom={
                form.originCountry
                  ? async (name) => {
                      const r = addCustomState(form.originCountry, name)
                      if (!r) return false
                      refresh()
                      setField('originState', r.name)
                      return true
                    }
                  : undefined
              }
            />
            <CityInputWithAdd
              id="originCity"
              label="City"
              value={form.originCity}
              onChange={(v) => setField('originCity', v)}
              suggestions={originCitySuggestions}
              disabled={!form.originCountry}
              onAddCustom={
                form.originCountry
                  ? async (cityName) => {
                      const r = addCustomCity(form.originCountry, cityName)
                      if (!r) return false
                      refresh()
                      setField('originCity', cityName)
                      return true
                    }
                  : undefined
              }
            />
            <PortCodeInputWithAdd
              id="originPortCode"
              label={templateUi.originPortLabel}
              hint="Sea = UNLOCODE (e.g. INNSA). Air = IATA 3-letter (e.g. MAA). Options follow service type (air/sea/road)."
              value={form.originPortCode}
              onChange={(v) => setField('originPortCode', v)}
              portOptions={originPortOpts}
              countryCode={form.originCountry}
              onRefresh={refresh}
              disabled={!form.originCountry}
            />
            <FormField label="Pickup type" htmlFor="pickupType">
              <Select id="pickupType" value={form.pickupType} onChange={(e) => setField('pickupType', e.target.value)}>
                {PICKUP_DELIVERY_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Pickup address" htmlFor="pickupAddress">
                <Textarea id="pickupAddress" rows={2} value={form.pickupAddress} onChange={(e) => setField('pickupAddress', e.target.value)} />
              </FormField>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <p className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Destination
            </p>
            <LocationSelectWithAdd
              id="destCountry"
              label="Country"
              value={form.destCountry}
              onChange={setDestCountry}
              options={countryOptions}
              placeholder="Select country…"
              addTitle="Add country"
              addInputLabel="Country name"
              onAddCustom={async (name) => {
                const r = addCustomCountry(name)
                if (!r) return false
                refresh()
                setForm((f) => ({
                  ...f,
                  destCountry: r.code,
                  destState: '',
                  destCity: '',
                  destPortCode: '',
                }))
                return true
              }}
            />
            <LocationSelectWithAdd
              id="destState"
              label="State / province"
              value={form.destState}
              onChange={(v) => setField('destState', v)}
              options={destStateOptions}
              placeholder={form.destCountry ? 'Select state…' : 'Select country first'}
              addTitle="Add state / province"
              addInputLabel="State or province name"
              disabled={!form.destCountry}
              onAddCustom={
                form.destCountry
                  ? async (name) => {
                      const r = addCustomState(form.destCountry, name)
                      if (!r) return false
                      refresh()
                      setField('destState', r.name)
                      return true
                    }
                  : undefined
              }
            />
            <CityInputWithAdd
              id="destCity"
              label="City"
              value={form.destCity}
              onChange={(v) => setField('destCity', v)}
              suggestions={destCitySuggestions}
              disabled={!form.destCountry}
              onAddCustom={
                form.destCountry
                  ? async (cityName) => {
                      const r = addCustomCity(form.destCountry, cityName)
                      if (!r) return false
                      refresh()
                      setField('destCity', cityName)
                      return true
                    }
                  : undefined
              }
            />
            <PortCodeInputWithAdd
              id="destPortCode"
              label={templateUi.destPortLabel}
              hint="Sea = UNLOCODE. Air = IATA. Options follow service type."
              value={form.destPortCode}
              onChange={(v) => setField('destPortCode', v)}
              portOptions={destPortOpts}
              countryCode={form.destCountry}
              onRefresh={refresh}
              disabled={!form.destCountry}
            />
            <FormField label="Delivery type" htmlFor="deliveryType">
              <Select id="deliveryType" value={form.deliveryType} onChange={(e) => setField('deliveryType', e.target.value)}>
                {PICKUP_DELIVERY_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Delivery address" htmlFor="deliveryAddress">
                <Textarea
                  id="deliveryAddress"
                  rows={2}
                  value={form.deliveryAddress}
                  onChange={(e) => setField('deliveryAddress', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </Card>

        {!freightUi ? (
          <EnquiryCargoDetailsCard
            sectionNum={4}
            freightUi={false}
            form={form}
            setForm={setForm}
            errors={errors}
            templateUi={templateUi}
            fdCardTone={fdCardTone}
            sectionAccent={sectionAccent}
            setField={setField}
          />
        ) : null}

        <Card
          tone={fdCardTone}
          title="5. Special handling & compliance"
          subtitle={
            freightUi
              ? 'Insurance and customs clearance (origin/destination) are controlled from Additional services in Cargo details — values stay in sync with these records.'
              : undefined
          }
          accent={sectionAccent}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Dangerous goods (DG)" htmlFor="dangerousGoods">
              <Select id="dangerousGoods" value={form.dangerousGoods} onChange={(e) => setField('dangerousGoods', e.target.value)}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </FormField>
            <FormField label="UN number" htmlFor="unNumber">
              <Input id="unNumber" value={form.unNumber} onChange={(e) => setField('unNumber', e.target.value)} />
            </FormField>
            <FormField label="IMO class" htmlFor="imoClass">
              <Input id="imoClass" value={form.imoClass} onChange={(e) => setField('imoClass', e.target.value)} />
            </FormField>
            <FormField label="Temperature control" htmlFor="tempControlRequired">
              <Select
                id="tempControlRequired"
                value={form.tempControlRequired}
                onChange={(e) => setField('tempControlRequired', e.target.value)}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </FormField>
            <FormField label="Temp. range (e.g. 2–8°C)" htmlFor="tempRange">
              <Input id="tempRange" value={form.tempRange} onChange={(e) => setField('tempRange', e.target.value)} />
            </FormField>
            {!freightUi ? (
              <>
                <FormField label="Insurance required" htmlFor="insuranceRequired">
                  <Select id="insuranceRequired" value={form.insuranceRequired} onChange={(e) => setField('insuranceRequired', e.target.value)}>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </FormField>
                <FormField label="Customs clearance — origin" htmlFor="customsClearanceOrigin">
                  <Select
                    id="customsClearanceOrigin"
                    value={form.customsClearanceOrigin}
                    onChange={(e) => setField('customsClearanceOrigin', e.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </FormField>
                <FormField label="Customs clearance — destination" htmlFor="customsClearanceDestination">
                  <Select
                    id="customsClearanceDestination"
                    value={form.customsClearanceDestination}
                    onChange={(e) => setField('customsClearanceDestination', e.target.value)}
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </FormField>
              </>
            ) : null}
            <div className="md:col-span-2">
              <FormField label="Special instructions" htmlFor="specialHandling">
                <Textarea id="specialHandling" rows={2} value={form.specialHandling} onChange={(e) => setField('specialHandling', e.target.value)} />
              </FormField>
            </div>
          </div>
        </Card>

        {(showAir || showSea || showRoad) && (
          <Card tone={fdCardTone} title="6. Mode-specific details" subtitle="Shown based on service type" accent={sectionAccent}>
            {showAir ? (
              <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Air freight</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Chargeable weight (kg)" htmlFor="airChargeableWeightKg">
                    <Input
                      id="airChargeableWeightKg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.airChargeableWeightKg}
                      onChange={(e) => setField('airChargeableWeightKg', e.target.value)}
                    />
                  </FormField>
                  <AirportCodeInputWithAdd
                    id="airIataCode"
                    value={form.airIataCode}
                    onChange={(v) => setField('airIataCode', v)}
                    options={airIataOpts}
                    onRefresh={refresh}
                  />
                  <FormField label="Preferred airline" htmlFor="airPreferredAirline">
                    <Input id="airPreferredAirline" value={form.airPreferredAirline} onChange={(e) => setField('airPreferredAirline', e.target.value)} />
                  </FormField>
                  <FormField label="Transit time requirement" htmlFor="airTransitTimeReq">
                    <Input id="airTransitTimeReq" value={form.airTransitTimeReq} onChange={(e) => setField('airTransitTimeReq', e.target.value)} />
                  </FormField>
                  <FormField label="AWB type" htmlFor="airAwbType">
                    <Select id="airAwbType" value={form.airAwbType} onChange={(e) => setField('airAwbType', e.target.value)}>
                      <option value="master">Master</option>
                      <option value="house">House</option>
                    </Select>
                  </FormField>
                </div>
              </div>
            ) : null}

            {showSea ? (
              <div className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-700">
                <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Sea freight</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Container type" htmlFor="seaContainerType" hint="ISO-style codes; pick Other if not listed">
                    <Select id="seaContainerType" value={form.seaContainerType} onChange={(e) => setField('seaContainerType', e.target.value)}>
                      {seaContainerOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Number of containers"
                    htmlFor="seaContainerCount"
                    hint={templateUi.volumeNosAsContainerCount ? 'Excel “volume in nos” often maps here for sea.' : undefined}
                  >
                    <Input
                      id="seaContainerCount"
                      type="number"
                      min="0"
                      value={form.seaContainerCount}
                      onChange={(e) => setField('seaContainerCount', e.target.value)}
                    />
                  </FormField>
                  <FormField label="LCL / FCL / Break-bulk" htmlFor="seaLoadType">
                    <Select
                      id="seaLoadType"
                      value={form.seaLoadType}
                      onChange={(e) => {
                        const v = e.target.value
                        setForm((f) => {
                          let modeType = f.modeType
                          if (v === 'Break-bulk') modeType = 'Break-bulk'
                          else if (modeType === 'Break-bulk') modeType = v === 'LCL' ? 'LCL' : 'FCL'
                          return { ...f, seaLoadType: v, modeType }
                        })
                      }}
                    >
                      <option value="FCL">FCL</option>
                      <option value="LCL">LCL</option>
                      <option value="Break-bulk">Break-bulk</option>
                    </Select>
                  </FormField>
                  <FormField label="Shipping line preference" htmlFor="seaShippingLinePreference">
                    <Input
                      id="seaShippingLinePreference"
                      value={form.seaShippingLinePreference}
                      onChange={(e) => setField('seaShippingLinePreference', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Free days requirement" htmlFor="seaFreeDaysRequired">
                    <Input id="seaFreeDaysRequired" value={form.seaFreeDaysRequired} onChange={(e) => setField('seaFreeDaysRequired', e.target.value)} />
                  </FormField>
                  <FormField label={templateUi.cutOffEtaLabel} htmlFor="seaPortCutoffDate">
                    <Input id="seaPortCutoffDate" type="date" value={form.seaPortCutoffDate} onChange={(e) => setField('seaPortCutoffDate', e.target.value)} />
                  </FormField>
                </div>
              </div>
            ) : null}

            {showRoad ? (
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Road freight</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Vehicle type" htmlFor="roadVehicleType">
                    <Input id="roadVehicleType" placeholder="Truck / Trailer / Reefer" value={form.roadVehicleType} onChange={(e) => setField('roadVehicleType', e.target.value)} />
                  </FormField>
                  <FormField label="Load type" htmlFor="roadLoadType">
                    <Select id="roadLoadType" value={form.roadLoadType} onChange={(e) => setField('roadLoadType', e.target.value)}>
                      <option value="full">Full</option>
                      <option value="partial">Partial</option>
                    </Select>
                  </FormField>
                  <FormField label="Route preference" htmlFor="roadRoutePreference">
                    <Input id="roadRoutePreference" value={form.roadRoutePreference} onChange={(e) => setField('roadRoutePreference', e.target.value)} />
                  </FormField>
                  <FormField label="Transit days" htmlFor="roadTransitDays">
                    <Input id="roadTransitDays" value={form.roadTransitDays} onChange={(e) => setField('roadTransitDays', e.target.value)} />
                  </FormField>
                  <div className="md:col-span-2">
                    <FormField label="Toll / permit requirements" htmlFor="roadTollPermitNotes">
                      <Textarea id="roadTollPermitNotes" rows={2} value={form.roadTollPermitNotes} onChange={(e) => setField('roadTollPermitNotes', e.target.value)} />
                    </FormField>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        )}

        <Card tone={fdCardTone} title="7. Timeline" accent={sectionAccent}>
          <div className="grid gap-4 md:grid-cols-2">
            {templateUi.showRequiredSchedule ? (
              <div className="md:col-span-2">
                <FormField label="Required schedule" htmlFor="requiredSchedule" hint="Sea import template (Excel).">
                  <Textarea id="requiredSchedule" rows={2} value={form.requiredSchedule} onChange={(e) => setField('requiredSchedule', e.target.value)} />
                </FormField>
              </div>
            ) : null}
            <FormField label="Ready date (cargo availability)" htmlFor="readyDate">
              <Input id="readyDate" type="date" value={form.readyDate} onChange={(e) => setField('readyDate', e.target.value)} />
            </FormField>
            <FormField label="Pickup date" htmlFor="pickupDate">
              <Input id="pickupDate" type="date" value={form.pickupDate} onChange={(e) => setField('pickupDate', e.target.value)} />
            </FormField>
            <FormField label="Expected delivery date" htmlFor="expectedDeliveryDate">
              <Input id="expectedDeliveryDate" type="date" value={form.expectedDeliveryDate} onChange={(e) => setField('expectedDeliveryDate', e.target.value)} />
            </FormField>
            <FormField label="Deadline / SLA" htmlFor="deadlineSla">
              <Input id="deadlineSla" type="date" value={form.deadlineSla} onChange={(e) => setField('deadlineSla', e.target.value)} />
            </FormField>
          </div>
        </Card>

        <Card tone={fdCardTone} title="8. Commercial / pricing (optional at inquiry)" accent={sectionAccent}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={templateUi.targetBudgetLabel} htmlFor="targetBudget">
              <Input id="targetBudget" type="number" min="0" step="0.01" value={form.targetBudget} onChange={(e) => setField('targetBudget', e.target.value)} />
            </FormField>
            <FormField label="Currency" htmlFor="currency">
              <Input id="currency" value={form.currency} onChange={(e) => setField('currency', e.target.value)} placeholder="USD" />
            </FormField>
            <FormField label="Payment terms" htmlFor="paymentTerms">
              <Input id="paymentTerms" value={form.paymentTerms} onChange={(e) => setField('paymentTerms', e.target.value)} />
            </FormField>
            <FormField label="Prepaid / collect / credit" htmlFor="paymentCollectMode">
              <Select id="paymentCollectMode" value={form.paymentCollectMode} onChange={(e) => setField('paymentCollectMode', e.target.value)}>
                <option value="prepaid">Prepaid</option>
                <option value="collect">Collect</option>
                <option value="credit">Credit</option>
              </Select>
            </FormField>
          </div>
        </Card>

        <Card tone={fdCardTone} title="9. Attachments & documents" subtitle="Check what you expect to receive; file upload can be wired to storage later" accent={sectionAccent}>
          <div className="flex flex-col gap-3 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.attachHasInvoice} onChange={(e) => setField('attachHasInvoice', e.target.checked)} />
              Invoice copy expected
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.attachHasPackingList} onChange={(e) => setField('attachHasPackingList', e.target.checked)} />
              Packing list
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.attachHasMsds} onChange={(e) => setField('attachHasMsds', e.target.checked)} />
              MSDS (dangerous goods)
            </label>
            <FormField label="Other documents / notes" htmlFor="attachOtherNotes">
              <Textarea id="attachOtherNotes" rows={2} value={form.attachOtherNotes} onChange={(e) => setField('attachOtherNotes', e.target.value)} />
            </FormField>
          </div>
        </Card>

        <Card tone={fdCardTone} title="10. Internal notes & assignment" accent={sectionAccent}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Sales person assigned" htmlFor="salesPersonAssigned">
              <Input id="salesPersonAssigned" value={form.salesPersonAssigned} onChange={(e) => setField('salesPersonAssigned', e.target.value)} />
            </FormField>
            <FormField
              label="Sales owner (user)"
              htmlFor="assignedSalesUserId"
              hint="Used for management reports by sales rep. Optional; falls back to matching the text fields above to a user."
            >
              <Select
                id="assignedSalesUserId"
                value={form.assignedSalesUserId || ''}
                onChange={(e) => setField('assignedSalesUserId', e.target.value)}
              >
                <option value="">Not set</option>
                {salesOwnerUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) — {u.role}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Branch / location" htmlFor="branchLocation">
              <Input id="branchLocation" value={form.branchLocation} onChange={(e) => setField('branchLocation', e.target.value)} />
            </FormField>
            <FormField label="Assigned to (legacy text)" htmlFor="assignedTo">
              <Input id="assignedTo" value={form.assignedTo} onChange={(e) => setField('assignedTo', e.target.value)} />
            </FormField>
            <FormField label="Follow-up date" htmlFor="followUpDate">
              <Input id="followUpDate" type="date" value={form.followUpDate} onChange={(e) => setField('followUpDate', e.target.value)} />
            </FormField>
            {templateUi.showOthersWorkflow ? (
              <>
                <FormField label="Enquiry received (date & time)" htmlFor="enquiryReceivedAt">
                  <Input
                    id="enquiryReceivedAt"
                    type="datetime-local"
                    value={form.enquiryReceivedAt}
                    onChange={(e) => setField('enquiryReceivedAt', e.target.value)}
                  />
                </FormField>
                <FormField label="Quote sent (date & time)" htmlFor="quoteSentAt">
                  <Input
                    id="quoteSentAt"
                    type="datetime-local"
                    value={form.quoteSentAt}
                    onChange={(e) => setField('quoteSentAt', e.target.value)}
                  />
                </FormField>
              </>
            ) : null}
            <div className="md:col-span-2">
              <FormField label="Internal notes" htmlFor="internalNotes">
                <Textarea id="internalNotes" rows={3} value={form.internalNotes} onChange={(e) => setField('internalNotes', e.target.value)} />
              </FormField>
            </div>
          </div>
        </Card>

        <Card tone={fdCardTone} title="11. Future linkages" subtitle="Store related record ids; enquiryId remains the business FK" accent={sectionAccent}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Linked quotation id" htmlFor="linkedQuotationId">
              <Input id="linkedQuotationId" value={form.linkedQuotationId} onChange={(e) => setField('linkedQuotationId', e.target.value)} />
            </FormField>
            <FormField label="Linked booking id" htmlFor="linkedBookingId">
              <Input id="linkedBookingId" value={form.linkedBookingId} onChange={(e) => setField('linkedBookingId', e.target.value)} />
            </FormField>
            <FormField label="Linked shipment / tracking id" htmlFor="linkedShipmentId">
              <Input id="linkedShipmentId" value={form.linkedShipmentId} onChange={(e) => setField('linkedShipmentId', e.target.value)} />
            </FormField>
            <FormField label="Linked invoice id" htmlFor="linkedInvoiceId">
              <Input id="linkedInvoiceId" value={form.linkedInvoiceId} onChange={(e) => setField('linkedInvoiceId', e.target.value)} />
            </FormField>
          </div>
        </Card>

        <Card
          tone={fdCardTone}
          title="Pricing line items"
          subtitle="Line-level rows for pricing team (per-line quotes)"
          accent={freightUi ? sectionAccent : 'from-teal-600 to-blue-800'}
        >
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            These lines drive the pricing workspace; keep them aligned with cargo where possible.
          </p>
          {errors.lineItems ? <p className="mb-2 text-sm text-rose-600">{errors.lineItems}</p> : null}
          <div className="space-y-3">
            {(form.lineItems || []).map((li, i) => (
              <div key={li.id || i} className="space-y-2 border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                <div className="grid gap-2 md:grid-cols-[1fr_100px_auto]">
                  <Input placeholder="Line description" value={li.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
                  <Input type="number" min="1" step="1" placeholder="Qty" value={li.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                  <Button type="button" variant="ghost" className="!px-2" onClick={() => removeLine(i)} disabled={(form.lineItems || []).length <= 1}>
                    Remove
                  </Button>
                </div>
                {pricingUsers.length > 0 ? (
                  <div className="border-t border-slate-200 pt-2 dark:border-slate-600">
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                      Pricing assignees for this line (optional — leave all unchecked to use enquiry-level assignees below).
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {pricingUsers.map((u) => (
                        <label key={u.id} className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={(li.assignedPricingUserIds || []).includes(u.id)}
                            onChange={() => toggleLinePricingUser(i, u.id)}
                          />
                          <span>
                            {u.name} <span className="text-slate-500">({u.email})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={addLine}>
              Add line item
            </Button>
          </div>
        </Card>

        <Card
          tone={fdCardTone}
          title="Pricing team"
          subtitle="Enquiry-level assignees; lines with no assignees inherit this list"
          accent={freightUi ? sectionAccent : 'from-teal-500 to-emerald-800'}
        >
          {pricingUsers.length === 0 ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">No pricing-role users yet — create them under Users (admin).</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {pricingUsers.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={(form.assignedPricingUserIds || []).includes(u.id)}
                      onChange={() => togglePricingUser(u.id)}
                    />
                    <span>
                      {u.name} <span className="text-slate-500">({u.email})</span>
                    </span>
                  </label>
                ))}
              </div>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={applyEnquiryAssigneesToAllLines}>
                Copy enquiry assignees to every line
              </Button>
            </div>
          )}
        </Card>

        <FormActions onReset={reset} onCancel={() => navigate(listPath)}>
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </FormActions>
      </form>
    </div>
  )
}
