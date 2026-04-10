import { useMemo } from 'react'
import { FormField } from '../../components/forms/FormField'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import {
  emptyCargoLine,
  FREIGHT_COMPLIANCE_TAG_MAP,
  FREIGHT_SERVICE_TAG_OPTIONS,
  SERVICE_TYPES,
  SHIPMENT_TYPES,
  modeOptionsForService,
  PACKAGING_TYPES,
} from './enquiryShared'

function useFreightHandlers(form, setForm) {
  const modeOpts = useMemo(() => modeOptionsForService(form.serviceType), [form.serviceType])

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setServiceType(value) {
    const nextModes = modeOptionsForService(value)
    const nextMode = nextModes.includes(form.modeType) ? form.modeType : nextModes[0] || ''
    setForm((f) => ({ ...f, serviceType: value, modeType: nextMode || f.modeType }))
  }

  function setCargoLine(i, key, value) {
    setForm((f) => ({
      ...f,
      cargoLines: (f.cargoLines || []).map((row, idx) => (idx === i ? { ...row, [key]: value } : row)),
    }))
  }

  function addCargoLine() {
    setForm((f) => ({ ...f, cargoLines: [...(f.cargoLines || []), emptyCargoLine()] }))
  }

  function removeCargoLine(i) {
    setForm((f) => {
      const lines = f.cargoLines || []
      if (lines.length <= 1) return f
      return { ...f, cargoLines: lines.filter((_, idx) => idx !== i) }
    })
  }

  function toggleTag(tag) {
    setForm((f) => {
      const cur = new Set(f.additionalServiceTags || [])
      const nextOn = !cur.has(tag)
      if (nextOn) cur.add(tag)
      else cur.delete(tag)
      const out = { ...f, additionalServiceTags: [...cur] }
      const complianceField = FREIGHT_COMPLIANCE_TAG_MAP[tag]
      if (complianceField) out[complianceField] = nextOn ? 'yes' : 'no'
      return out
    })
  }

  return {
    modeOpts,
    setField,
    setServiceType,
    setCargoLine,
    addCargoLine,
    removeCargoLine,
    toggleTag,
  }
}

/** Route summary + same control pattern as Inquiry Master (Selects). */
export function FreightRouteFlowSection({ form, setForm, modeTypeHint }) {
  const { modeOpts, setField, setServiceType } = useFreightHandlers(form, setForm)
  const pol = (form.routePolText || '').trim() || '—'
  const pod = (form.routePodText || '').trim() || '—'
  const modeSummary = [form.serviceType, form.modeType].filter(Boolean).join(' · ').toUpperCase()

  const routeSummarySr = [pol, pod, modeSummary ? `(${modeSummary})` : ''].filter(Boolean).join(' ')

  return (
    <div className="space-y-4">
      <div
        className="fd-route-banner -mx-6 mb-1 w-[calc(100%+3rem)] max-w-none"
        role="region"
        aria-label="Route summary"
      >
        <span className="sr-only">{routeSummarySr}</span>
        <div className="fd-route-banner__pol">
          <span className="fd-route-banner__label">Origin (POL)</span>
          <span className="fd-route-banner__code">{pol}</span>
        </div>
        <div className="fd-route-banner__mid">
          <div className="fd-route-banner__line" aria-hidden />
          {modeSummary ? <div className="fd-route-banner__mode">({modeSummary})</div> : null}
        </div>
        <div className="fd-route-banner__pod">
          <span className="fd-route-banner__label">Destination (POD)</span>
          <span className="fd-route-banner__code">{pod}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Edit POL/POD labels in <strong className="font-medium text-slate-700 dark:text-slate-300">Route text & validity</strong> below.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Shipment type" htmlFor="fd-shipmentType">
          <Select id="fd-shipmentType" value={form.shipmentType} onChange={(e) => setField('shipmentType', e.target.value)}>
            {SHIPMENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Service type" htmlFor="fd-serviceType">
          <Select id="fd-serviceType" value={form.serviceType} onChange={(e) => setServiceType(e.target.value)}>
            {SERVICE_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Mode / load type" htmlFor="fd-modeType" hint={modeTypeHint}>
          <Select id="fd-modeType" value={form.modeType || ''} onChange={(e) => setField('modeType', e.target.value)}>
            <option value="">Select…</option>
            {modeOpts.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </div>
  )
}

/** Line items using the same FormField + Input/Select grid as the rest of the enquiry form. */
export function FreightCargoLinesSection({ form, setForm }) {
  const { setCargoLine, addCargoLine, removeCargoLine } = useFreightHandlers(form, setForm)
  const cargoLines = form.cargoLines?.length ? form.cargoLines : [emptyCargoLine()]

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        One block per physical cargo line (separate from pricing line items later). Add at least one description, or use the
        legacy enquiry form for a single commodity field.
      </p>
      {cargoLines.map((row, i) => (
        <div
          key={row.id || i}
          className="border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/40"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Line {i + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              className="!min-h-0 shrink-0 !py-1.5 !text-xs"
              disabled={cargoLines.length <= 1}
              onClick={() => removeCargoLine(i)}
            >
              Remove line
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FormField label="Description" htmlFor={`cargo-desc-${i}`}>
                <Input
                  id={`cargo-desc-${i}`}
                  value={row.description ?? ''}
                  onChange={(e) => setCargoLine(i, 'description', e.target.value)}
                  placeholder="Commodity / marks"
                />
              </FormField>
            </div>
            <FormField label="Packaging type" htmlFor={`cargo-pkg-${i}`}>
              <Select
                id={`cargo-pkg-${i}`}
                value={row.packagingType || 'cartons'}
                onChange={(e) => setCargoLine(i, 'packagingType', e.target.value)}
              >
                {PACKAGING_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Quantity" htmlFor={`cargo-qty-${i}`}>
              <Input
                id={`cargo-qty-${i}`}
                inputMode="numeric"
                value={row.quantity ?? ''}
                onChange={(e) => setCargoLine(i, 'quantity', e.target.value)}
                placeholder="—"
              />
            </FormField>
            <FormField label="Gross weight (kg)" htmlFor={`cargo-kg-${i}`}>
              <Input
                id={`cargo-kg-${i}`}
                inputMode="decimal"
                value={row.grossWeightKg ?? ''}
                onChange={(e) => setCargoLine(i, 'grossWeightKg', e.target.value)}
                placeholder="—"
              />
            </FormField>
            <FormField label="Volume (CBM)" htmlFor={`cargo-cbm-${i}`}>
              <Input
                id={`cargo-cbm-${i}`}
                inputMode="decimal"
                value={row.volumeCbm ?? ''}
                onChange={(e) => setCargoLine(i, 'volumeCbm', e.target.value)}
                placeholder="—"
              />
            </FormField>
            <FormField label="Dimensions (cm)" htmlFor={`cargo-dims-${i}`} hint="e.g. 120×80×100 or L×W×H">
              <Input
                id={`cargo-dims-${i}`}
                value={row.dimensionsCm ?? ''}
                onChange={(e) => setCargoLine(i, 'dimensionsCm', e.target.value)}
                placeholder="L×W×H"
              />
            </FormField>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addCargoLine}>
        + Add line
      </Button>
    </div>
  )
}

/** Same field components as elsewhere; service picks use outline / primary buttons. */
export function FreightServicesAndValiditySection({ form, setForm }) {
  const { setField, toggleTag } = useFreightHandlers(form, setForm)
  const tags = new Set(form.additionalServiceTags || [])

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Additional services</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FREIGHT_SERVICE_TAG_OPTIONS.map((tag) => (
            <Button
              key={tag}
              type="button"
              variant={tags.has(tag) ? 'primary' : 'outline'}
              className="!h-auto min-h-[2.75rem] !justify-start !whitespace-normal !py-2.5 !px-3 !text-left !text-sm !font-normal"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Route text & validity</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="POL (free text)" htmlFor="fd-route-pol">
            <Input
              id="fd-route-pol"
              value={form.routePolText ?? ''}
              onChange={(e) => setField('routePolText', e.target.value)}
              placeholder="e.g. USNYC / Shanghai"
            />
          </FormField>
          <FormField label="POD (free text)" htmlFor="fd-route-pod">
            <Input
              id="fd-route-pod"
              value={form.routePodText ?? ''}
              onChange={(e) => setField('routePodText', e.target.value)}
              placeholder="e.g. DEHAM / Los Angeles"
            />
          </FormField>
          <FormField label="Enquiry valid until" htmlFor="fd-valid-until">
            <Input
              id="fd-valid-until"
              type="date"
              value={form.enquiryValidUntil ?? ''}
              onChange={(e) => setField('enquiryValidUntil', e.target.value)}
            />
          </FormField>
          <FormField label="Declared value (USD)" htmlFor="fd-declared-usd" hint="Maps to budget when budget is empty.">
            <Input
              id="fd-declared-usd"
              inputMode="decimal"
              value={form.declaredValueUsd ?? ''}
              onChange={(e) => setField('declaredValueUsd', e.target.value)}
              placeholder="Optional"
            />
          </FormField>
        </div>
      </div>
    </div>
  )
}
