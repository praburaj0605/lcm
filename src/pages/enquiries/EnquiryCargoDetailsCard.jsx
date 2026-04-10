import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { FormField } from '../../components/forms/FormField'
import { CARGO_CATEGORIES, PACKAGING_TYPES } from './enquiryShared'
import {
  FreightRouteFlowSection,
  FreightCargoLinesSection,
  FreightServicesAndValiditySection,
} from './FreightDeskEnquiryChrome'

/**
 * Cargo details section — used as form §2 (freight) or §4 (legacy). Same content; only `sectionNum` title changes.
 */
export function EnquiryCargoDetailsCard({
  sectionNum,
  freightUi,
  form,
  setForm,
  errors,
  templateUi,
  fdCardTone,
  sectionAccent,
  setField,
}) {
  return (
    <Card
      tone={fdCardTone}
      title={`${sectionNum}. Cargo details`}
      subtitle={
        freightUi
          ? 'Route, mode, line cargo, services, then HS code and classification — line totals roll up on save.'
          : 'Commodity, HS code, weights & volume'
      }
      accent={sectionAccent}
    >
      {freightUi ? (
        <div className="mb-8 space-y-8 border-b border-slate-200 pb-8 dark:border-slate-700">
          <section className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Route & flow</p>
            <FreightRouteFlowSection form={form} setForm={setForm} modeTypeHint={templateUi.modeTypeHint} />
          </section>
          <section className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cargo lines</p>
            <FreightCargoLinesSection form={form} setForm={setForm} />
          </section>
          <FreightServicesAndValiditySection form={form} setForm={setForm} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {!freightUi ? (
          <div className="md:col-span-2">
            <FormField
              label={`${templateUi.commodityLabel} (description)`}
              htmlFor="commodityDescription"
              error={errors.commodityDescription}
              required
            >
              <Textarea
                id="commodityDescription"
                rows={3}
                value={form.commodityDescription}
                onChange={(e) => setField('commodityDescription', e.target.value)}
                error={errors.commodityDescription}
              />
            </FormField>
          </div>
        ) : null}
        <FormField label="HS code" htmlFor="hsCode">
          <Input id="hsCode" value={form.hsCode} onChange={(e) => setField('hsCode', e.target.value)} />
        </FormField>
        <FormField label="Cargo type" htmlFor="cargoCategory">
          <Select id="cargoCategory" value={form.cargoCategory} onChange={(e) => setField('cargoCategory', e.target.value)}>
            {CARGO_CATEGORIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        {!freightUi ? (
          <>
            <FormField label="Packaging type" htmlFor="packagingType">
              <Select id="packagingType" value={form.packagingType} onChange={(e) => setField('packagingType', e.target.value)}>
                {PACKAGING_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={templateUi.numPackagesLabel}
              htmlFor="numPackages"
              hint={
                templateUi.volumeNosAsContainerCount
                  ? 'Also used like Excel “volume in nos” for unit count when not using container count below.'
                  : undefined
              }
            >
              <Input id="numPackages" type="number" min="0" value={form.numPackages} onChange={(e) => setField('numPackages', e.target.value)} />
            </FormField>
          </>
        ) : null}
        {templateUi.showAirImportExtras ? (
          <FormField label="Weight per package (kg)" htmlFor="weightPerPackageKg">
            <Input
              id="weightPerPackageKg"
              type="number"
              min="0"
              step="0.01"
              value={form.weightPerPackageKg}
              onChange={(e) => setField('weightPerPackageKg', e.target.value)}
            />
          </FormField>
        ) : null}
        {!freightUi ? (
          <>
            <FormField label="Length (cm)" htmlFor="dimLengthCm">
              <Input id="dimLengthCm" type="number" min="0" step="0.01" value={form.dimLengthCm} onChange={(e) => setField('dimLengthCm', e.target.value)} />
            </FormField>
            <FormField label="Width (cm)" htmlFor="dimWidthCm">
              <Input id="dimWidthCm" type="number" min="0" step="0.01" value={form.dimWidthCm} onChange={(e) => setField('dimWidthCm', e.target.value)} />
            </FormField>
            <FormField label="Height (cm)" htmlFor="dimHeightCm">
              <Input id="dimHeightCm" type="number" min="0" step="0.01" value={form.dimHeightCm} onChange={(e) => setField('dimHeightCm', e.target.value)} />
            </FormField>
          </>
        ) : null}
        {templateUi.showDimensionsText ? (
          <div className="md:col-span-2">
            <FormField
              label="Dimensions (as stated)"
              htmlFor="dimensionsDescription"
              hint={
                freightUi
                  ? 'Optional shipment-level note alongside per-line dimensions in the grid.'
                  : 'Optional free text (e.g. 8.5 × 5.5 × 8.0 m) alongside cm fields.'
              }
            >
              <Textarea
                id="dimensionsDescription"
                rows={2}
                value={form.dimensionsDescription}
                onChange={(e) => setField('dimensionsDescription', e.target.value)}
              />
            </FormField>
          </div>
        ) : null}
        {templateUi.showGrossWeightTons ? (
          <FormField label="Gross weight (metric tons)" htmlFor="grossWeightTons" hint="Optional; Excel-style weight in tons.">
            <Input
              id="grossWeightTons"
              type="number"
              min="0"
              step="0.001"
              value={form.grossWeightTons}
              onChange={(e) => setField('grossWeightTons', e.target.value)}
            />
          </FormField>
        ) : null}
        {!freightUi ? (
          <>
            <FormField label="Gross weight (kg)" htmlFor="grossWeightKg">
              <Input
                id="grossWeightKg"
                type="number"
                min="0"
                step="0.01"
                value={form.grossWeightKg}
                onChange={(e) => setField('grossWeightKg', e.target.value)}
              />
            </FormField>
            <FormField label="Net weight (kg)" htmlFor="netWeightKg">
              <Input id="netWeightKg" type="number" min="0" step="0.01" value={form.netWeightKg} onChange={(e) => setField('netWeightKg', e.target.value)} />
            </FormField>
            <FormField label="Volume (CBM)" htmlFor="volumeCbm">
              <Input id="volumeCbm" type="number" min="0" step="0.001" value={form.volumeCbm} onChange={(e) => setField('volumeCbm', e.target.value)} />
            </FormField>
          </>
        ) : (
          <FormField label="Net weight (kg)" htmlFor="netWeightKg">
            <Input id="netWeightKg" type="number" min="0" step="0.01" value={form.netWeightKg} onChange={(e) => setField('netWeightKg', e.target.value)} />
          </FormField>
        )}
        {templateUi.showCargoReadinessText ? (
          <FormField label="Cargo readiness" htmlFor="cargoReadiness" hint="Date in timeline below, or text such as N/A.">
            <Input id="cargoReadiness" value={form.cargoReadiness} onChange={(e) => setField('cargoReadiness', e.target.value)} placeholder="e.g. N/A or notes" />
          </FormField>
        ) : null}
        <div className="md:col-span-2">
          <FormField label="Remarks" htmlFor="enquiryRemarks" hint="General enquiry remarks (Excel REMARKS).">
            <Textarea id="enquiryRemarks" rows={2} value={form.enquiryRemarks} onChange={(e) => setField('enquiryRemarks', e.target.value)} />
          </FormField>
        </div>
      </div>
    </Card>
  )
}
