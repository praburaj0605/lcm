import { nanoid } from 'nanoid'
import { useAppStore } from '../../store/useAppStore'
import { resolveCountryCode } from '../../services/locationRegistry'
import { inferEnquiryTemplate } from './enquiryTemplateConfig'

export { inferEnquiryTemplate }

export function emptyLineItem() {
  return { id: nanoid(), description: '', quantity: 1, assignedPricingUserIds: [] }
}

/** Physical cargo lines (FreightDesk-style); separate from pricing `lineItems`. */
export function emptyCargoLine() {
  return {
    id: nanoid(),
    description: '',
    packagingType: 'cartons',
    quantity: '',
    grossWeightKg: '',
    volumeCbm: '',
    dimensionsCm: '',
  }
}

/** Optional tags from FreightDesk “Additional services” chip grid. */
export const FREIGHT_COMPLIANCE_TAG_MAP = {
  'Cargo Insurance': 'insuranceRequired',
  'Customs Clearance (Origin)': 'customsClearanceOrigin',
  'Customs Clearance (Dest.)': 'customsClearanceDestination',
}

/** Merge stored tags with legacy yes/no compliance fields (edit + API round-trip). */
export function mergeComplianceTagsFromRecord(e) {
  const tags = new Set(Array.isArray(e.additionalServiceTags) ? [...e.additionalServiceTags] : [])
  if (e.insuranceRequired === 'yes') tags.add('Cargo Insurance')
  if (e.customsClearanceOrigin === 'yes') tags.add('Customs Clearance (Origin)')
  if (e.customsClearanceDestination === 'yes') tags.add('Customs Clearance (Dest.)')
  return [...tags]
}

export const FREIGHT_SERVICE_TAG_OPTIONS = [
  'Cargo Insurance',
  'Customs Clearance (Origin)',
  'Customs Clearance (Dest.)',
  'Inland Transport Origin',
  'Inland Transport Dest.',
  'Fumigation',
  'Palletization',
  'Warehousing',
  'Crane Loading',
  'Stuffing',
]

export function emptyFreightEnquiryFields() {
  return {
    cargoLines: [emptyCargoLine()],
    routePolText: '',
    routePodText: '',
    enquiryValidUntil: '',
    declaredValueUsd: '',
    additionalServiceTags: [],
  }
}

export const SERVICE_TYPES = [
  { value: 'air', label: 'Air' },
  { value: 'sea', label: 'Sea' },
  { value: 'road', label: 'Road' },
  { value: 'multimodal', label: 'Multimodal' },
]

export const SHIPMENT_TYPES = [
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'domestic', label: 'Domestic' },
]

export const CUSTOMER_TYPES = [
  { value: 'shipper', label: 'Shipper' },
  { value: 'consignee', label: 'Consignee' },
  { value: 'agent', label: 'Agent' },
]

export const PICKUP_DELIVERY_TYPES = [
  { value: 'door', label: 'Door' },
  { value: 'port', label: 'Port' },
]

export const CARGO_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'dangerous', label: 'Dangerous' },
  { value: 'perishable', label: 'Perishable' },
  { value: 'fragile', label: 'Fragile' },
]

export const PACKAGING_TYPES = [
  { value: 'pallets', label: 'Pallets' },
  { value: 'cartons', label: 'Cartons' },
  { value: 'drums', label: 'Drums' },
  { value: 'loose', label: 'Loose' },
]

export const INCOTERMS = [
  'EXW',
  'FCA',
  'CPT',
  'CIP',
  'DAP',
  'DPU',
  'DDP',
  'FAS',
  'FOB',
  'CFR',
  'CIF',
]

export const STATUS_OPTIONS = ['New', 'In Progress', 'Quoted', 'Closed']

export const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Critical', 'Urgent']

export const SOURCE_OPTIONS = ['website', 'call', 'email', 'referral', 'other']

/** Mode / load types depend on service; options shown in UI by serviceType. */
export const SEA_MODE_TYPES = ['FCL', 'LCL', 'Break-bulk']
export const ROAD_MODE_TYPES = ['FTL', 'LTL']
export const AIR_MODE_TYPES = ['Standard', 'Express', 'Charter']

/**
 * Common ISO 6346 / industry container types (dry, reefer, special equipment).
 * Values are stable codes stored on enquiries.
 */
export const SEA_CONTAINER_TYPES = [
  { value: '10GP', label: "10' General Purpose (Dry)" },
  { value: '20GP', label: "20' General Purpose (Dry) — 20DC / 22G1" },
  { value: '40GP', label: "40' General Purpose (Dry) — 40DC / 42G1" },
  { value: '40HC', label: "40' High Cube (Dry) — 45G1" },
  { value: '45HC', label: "45' High Cube (Dry)" },
  { value: '53GP', label: "53' General Purpose (Dry, US domestic)" },
  { value: '20HC', label: "20' High Cube (Dry)" },
  { value: '20RF', label: "20' Reefer — 22R1" },
  { value: '40RF', label: "40' Reefer — 42R1" },
  { value: '40HCRF', label: "40' High Cube Reefer — 45R1" },
  { value: '20OT', label: "20' Open Top" },
  { value: '40OT', label: "40' Open Top" },
  { value: '20FR', label: "20' Flat Rack (collapsible ends)" },
  { value: '40FR', label: "40' Flat Rack (collapsible ends)" },
  { value: '20PL', label: "20' Platform" },
  { value: '40PL', label: "40' Platform" },
  { value: '20TK', label: "20' Tank (liquid bulk)" },
  { value: '40TK', label: "40' Tank (liquid bulk)" },
  { value: 'ISO20', label: "20' ISO Tank (hazardous / food-grade)" },
  { value: '20HH', label: "20' Half Height (bulk, heavy ore)" },
  { value: '40HH', label: "40' Half Height" },
  { value: '20BK', label: "20' Bulk (dry bulk)" },
  { value: '40BK', label: "40' Bulk (dry bulk)" },
  { value: '20GOH', label: "20' Garment on Hanger" },
  { value: '40GOH', label: "40' Garment on Hanger" },
  { value: '40OS', label: "40' Open Side" },
  { value: '20SD', label: "20' Side Door" },
  { value: '40SD', label: "40' Side Door" },
  { value: '20RE', label: "20' Reefer (alt code)" },
  { value: '40RE', label: "40' Reefer (alt code)" },
  { value: '45GP', label: "45' General Purpose (Dry)" },
  { value: '20DV', label: "20' Dry Van (same as 20GP)" },
  { value: '40DV', label: "40' Dry Van (same as 40GP)" },
  { value: '40NOR', label: "40' Non-operating Reefer (insulated)" },
  { value: 'OTHER', label: 'Other (describe in special instructions)' },
]

/** Legacy UI values → canonical codes */
const LEGACY_SEA_CONTAINER = {
  '20FT': '20GP',
  '40FT': '40GP',
  '45FT': '45HC',
}

export function normalizeSeaContainerType(raw) {
  if (!raw) return '40HC'
  const s = String(raw).trim()
  return LEGACY_SEA_CONTAINER[s] || LEGACY_SEA_CONTAINER[s.toUpperCase()] || s
}

export function modeOptionsForService(serviceType) {
  if (serviceType === 'sea') return SEA_MODE_TYPES
  if (serviceType === 'road') return ROAD_MODE_TYPES
  if (serviceType === 'air') return AIR_MODE_TYPES
  return [...SEA_MODE_TYPES, ...ROAD_MODE_TYPES]
}

/** HTML datetime-local value ↔ stored ISO (for enquiry workflow fields). */
export function toDatetimeLocalValue(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const s = iso.trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function normalizeDatetimeLocalForStore(s) {
  if (!s || typeof s !== 'string') return ''
  const t = s.trim()
  if (!t) return ''
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? t : d.toISOString()
}

export function emptyEnquiry() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    enquiryId: '',
    inquiryDate: today,
    enquiryTemplate: 'sea_import',
    serviceType: 'sea',
    shipmentType: 'import',
    modeType: 'FCL',
    incoterms: '',
    priority: 'Normal',
    status: 'New',
    source: 'website',
    salesChannel: '',

    clientId: '',
    customerCompanyName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    gstTaxId: '',
    customerType: 'shipper',

    originCountry: '',
    originState: '',
    originCity: '',
    originPortCode: '',
    pickupAddress: '',
    pickupType: 'door',
    destCountry: '',
    destState: '',
    destCity: '',
    destPortCode: '',
    deliveryAddress: '',
    deliveryType: 'door',

    commodityDescription: '',
    hsCode: '',
    cargoCategory: 'general',
    packagingType: 'cartons',
    numPackages: '',
    dimLengthCm: '',
    dimWidthCm: '',
    dimHeightCm: '',
    grossWeightKg: '',
    grossWeightTons: '',
    netWeightKg: '',
    weightPerPackageKg: '',
    volumeCbm: '',
    dimensionsDescription: '',
    cargoReadiness: '',
    enquiryRemarks: '',
    requiredSchedule: '',

    dangerousGoods: 'no',
    unNumber: '',
    imoClass: '',
    tempControlRequired: 'no',
    tempRange: '',
    insuranceRequired: 'no',
    customsClearanceOrigin: 'no',
    customsClearanceDestination: 'no',
    specialHandling: '',

    airChargeableWeightKg: '',
    airIataCode: '',
    airPreferredAirline: '',
    airTransitTimeReq: '',
    airAwbType: 'house',

    seaContainerType: '40HC',
    seaContainerCount: '',
    seaLoadType: 'FCL',
    seaShippingLinePreference: '',
    seaFreeDaysRequired: '',
    seaPortCutoffDate: '',

    roadVehicleType: '',
    roadLoadType: 'full',
    roadRoutePreference: '',
    roadTransitDays: '',
    roadTollPermitNotes: '',

    readyDate: '',
    pickupDate: '',
    expectedDeliveryDate: '',
    deadlineSla: '',

    targetBudget: '',
    currency: 'USD',
    paymentTerms: '',
    paymentCollectMode: 'prepaid',

    attachHasInvoice: false,
    attachHasPackingList: false,
    attachHasMsds: false,
    attachOtherNotes: '',

    salesPersonAssigned: '',
    assignedSalesUserId: '',
    branchLocation: '',
    internalNotes: '',
    followUpDate: '',
    enquiryReceivedAt: '',
    quoteSentAt: '',

    linkedQuotationId: '',
    linkedBookingId: '',
    linkedShipmentId: '',
    linkedInvoiceId: '',

    assignedTo: '',
    description: '',
    notes: '',
    lineItems: [emptyLineItem()],
    assignedPricingUserIds: [],

    ...emptyFreightEnquiryFields(),
  }
}

export function mapEnquiryToForm(e) {
  const lineItems =
    e.lineItems?.length > 0
      ? e.lineItems.map((li) => ({
          ...li,
          quantity: Number(li.quantity) || 1,
          assignedPricingUserIds: Array.isArray(li.assignedPricingUserIds) ? [...li.assignedPricingUserIds] : [],
        }))
      : [emptyLineItem()]
  const cargoLines =
    e.cargoLines?.length > 0
      ? e.cargoLines.map((row) => ({
          id: row.id || nanoid(),
          description: row.description ?? '',
          packagingType: row.packagingType ?? 'cartons',
          quantity: row.quantity !== undefined && row.quantity !== null ? String(row.quantity) : '',
          grossWeightKg:
            row.grossWeightKg !== undefined && row.grossWeightKg !== null ? String(row.grossWeightKg) : '',
          volumeCbm: row.volumeCbm !== undefined && row.volumeCbm !== null ? String(row.volumeCbm) : '',
          dimensionsCm: row.dimensionsCm ?? '',
        }))
      : [emptyCargoLine()]
  const commodity = e.commodityDescription ?? e.description ?? ''
  const internalNotes = e.internalNotes ?? e.notes ?? ''
  const targetBudget =
    e.targetBudget !== undefined && e.targetBudget !== null
      ? String(e.targetBudget)
      : e.expectedValue === 0 || e.expectedValue
        ? String(e.expectedValue)
        : ''

  const serviceType = e.serviceType ?? 'sea'
  const shipmentType = e.shipmentType ?? 'import'
  const enquiryTemplate =
    e.enquiryTemplate && String(e.enquiryTemplate).trim()
      ? String(e.enquiryTemplate).trim()
      : inferEnquiryTemplate(serviceType, shipmentType)

  return {
    enquiryId: e.enquiryId ?? '',
    inquiryDate: e.inquiryDate ?? (e.createdAt ? e.createdAt.slice(0, 10) : ''),
    enquiryTemplate,
    serviceType,
    shipmentType,
    modeType: e.modeType ?? '',
    incoterms: e.incoterms ?? '',
    salesChannel: e.salesChannel ?? '',
    priority: e.priority ?? 'Normal',
    status: e.status ?? 'New',
    source: e.source ?? 'website',

    clientId: e.clientId ?? '',
    customerCompanyName: e.customerCompanyName ?? '',
    contactPerson: e.contactPerson ?? '',
    contactEmail: e.contactEmail ?? '',
    contactPhone: e.contactPhone ?? '',
    gstTaxId: e.gstTaxId ?? '',
    customerType: e.customerType ?? 'shipper',

    originCountry: resolveCountryCode(e.originCountry) || e.originCountry || '',
    originState: e.originState ?? '',
    originCity: e.originCity ?? '',
    originPortCode: e.originPortCode ?? '',
    pickupAddress: e.pickupAddress ?? '',
    pickupType: e.pickupType ?? 'door',
    destCountry: resolveCountryCode(e.destCountry) || e.destCountry || '',
    destState: e.destState ?? '',
    destCity: e.destCity ?? '',
    destPortCode: e.destPortCode ?? '',
    deliveryAddress: e.deliveryAddress ?? '',
    deliveryType: e.deliveryType ?? 'door',

    commodityDescription: commodity,
    hsCode: e.hsCode ?? '',
    cargoCategory: e.cargoCategory ?? 'general',
    packagingType: e.packagingType ?? 'cartons',
    numPackages: e.numPackages !== undefined && e.numPackages !== null ? String(e.numPackages) : '',
    dimLengthCm: e.dimLengthCm !== undefined && e.dimLengthCm !== null ? String(e.dimLengthCm) : '',
    dimWidthCm: e.dimWidthCm !== undefined && e.dimWidthCm !== null ? String(e.dimWidthCm) : '',
    dimHeightCm: e.dimHeightCm !== undefined && e.dimHeightCm !== null ? String(e.dimHeightCm) : '',
    grossWeightKg: e.grossWeightKg !== undefined && e.grossWeightKg !== null ? String(e.grossWeightKg) : '',
    grossWeightTons: e.grossWeightTons !== undefined && e.grossWeightTons !== null ? String(e.grossWeightTons) : '',
    netWeightKg: e.netWeightKg !== undefined && e.netWeightKg !== null ? String(e.netWeightKg) : '',
    weightPerPackageKg:
      e.weightPerPackageKg !== undefined && e.weightPerPackageKg !== null ? String(e.weightPerPackageKg) : '',
    volumeCbm: e.volumeCbm !== undefined && e.volumeCbm !== null ? String(e.volumeCbm) : '',
    dimensionsDescription: e.dimensionsDescription ?? '',
    cargoReadiness: e.cargoReadiness ?? '',
    enquiryRemarks: e.enquiryRemarks ?? '',
    requiredSchedule: e.requiredSchedule ?? '',

    dangerousGoods: e.dangerousGoods ?? 'no',
    unNumber: e.unNumber ?? '',
    imoClass: e.imoClass ?? '',
    tempControlRequired: e.tempControlRequired ?? 'no',
    tempRange: e.tempRange ?? '',
    insuranceRequired: e.insuranceRequired ?? 'no',
    customsClearanceOrigin: e.customsClearanceOrigin ?? 'no',
    customsClearanceDestination: e.customsClearanceDestination ?? 'no',
    specialHandling: e.specialHandling ?? '',

    airChargeableWeightKg: e.airChargeableWeightKg !== undefined && e.airChargeableWeightKg !== null ? String(e.airChargeableWeightKg) : '',
    airIataCode: e.airIataCode ?? '',
    airPreferredAirline: e.airPreferredAirline ?? '',
    airTransitTimeReq: e.airTransitTimeReq ?? '',
    airAwbType: e.airAwbType ?? 'house',

    seaContainerType: normalizeSeaContainerType(e.seaContainerType),
    seaContainerCount: e.seaContainerCount !== undefined && e.seaContainerCount !== null ? String(e.seaContainerCount) : '',
    seaLoadType: e.seaLoadType ?? 'FCL',
    seaShippingLinePreference: e.seaShippingLinePreference ?? '',
    seaFreeDaysRequired: e.seaFreeDaysRequired ?? '',
    seaPortCutoffDate: e.seaPortCutoffDate ?? '',

    roadVehicleType: e.roadVehicleType ?? '',
    roadLoadType: e.roadLoadType ?? 'full',
    roadRoutePreference: e.roadRoutePreference ?? '',
    roadTransitDays: e.roadTransitDays ?? '',
    roadTollPermitNotes: e.roadTollPermitNotes ?? '',

    readyDate: e.readyDate ?? '',
    pickupDate: e.pickupDate ?? '',
    expectedDeliveryDate: e.expectedDeliveryDate ?? '',
    deadlineSla: e.deadlineSla ?? '',

    targetBudget,
    currency: e.currency ?? 'USD',
    paymentTerms: e.paymentTerms ?? '',
    paymentCollectMode: e.paymentCollectMode ?? 'prepaid',

    attachHasInvoice: Boolean(e.attachHasInvoice),
    attachHasPackingList: Boolean(e.attachHasPackingList),
    attachHasMsds: Boolean(e.attachHasMsds),
    attachOtherNotes: e.attachOtherNotes ?? '',

    salesPersonAssigned: e.salesPersonAssigned ?? '',
    assignedSalesUserId: e.assignedSalesUserId ?? '',
    branchLocation: e.branchLocation ?? '',
    internalNotes,
    followUpDate: e.followUpDate ?? '',
    enquiryReceivedAt: toDatetimeLocalValue(e.enquiryReceivedAt),
    quoteSentAt: toDatetimeLocalValue(e.quoteSentAt),

    linkedQuotationId: e.linkedQuotationId ?? '',
    linkedBookingId: e.linkedBookingId ?? '',
    linkedShipmentId: e.linkedShipmentId ?? '',
    linkedInvoiceId: e.linkedInvoiceId ?? '',

    assignedTo: e.assignedTo ?? '',
    description: commodity,
    notes: internalNotes,
    lineItems,
    assignedPricingUserIds: [...(e.assignedPricingUserIds || [])],

    cargoLines,
    routePolText: e.routePolText ?? '',
    routePodText: e.routePodText ?? '',
    enquiryValidUntil: e.enquiryValidUntil ?? '',
    declaredValueUsd:
      e.declaredValueUsd !== undefined && e.declaredValueUsd !== null ? String(e.declaredValueUsd) : '',
    additionalServiceTags: mergeComplianceTagsFromRecord(e),
  }
}

export function validateEnquiry(form) {
  const errors = {}
  if (!form.clientId) errors.clientId = 'Select a client'
  const hasCargoLineDesc = (form.cargoLines || []).some((row) => String(row?.description || '').trim())
  if (!form.commodityDescription?.trim() && !hasCargoLineDesc) {
    errors.commodityDescription = 'Enter a commodity description or at least one cargo line description'
  }
  if (!form.lineItems?.length) errors.lineItems = 'Add at least one pricing line item'
  else if (form.lineItems.some((li) => !String(li.description || '').trim())) {
    errors.lineItems = 'Each line item needs a description'
  }
  return errors
}

function numOrEmpty(v) {
  if (v === '' || v === undefined || v === null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function normalizeCargoLinesForStore(lines) {
  return (lines || []).map((row) => ({
    id: row.id || nanoid(),
    description: String(row.description || '').trim(),
    packagingType: String(row.packagingType || 'cartons'),
    quantity: row.quantity === '' || row.quantity == null ? undefined : Math.max(0, Number(row.quantity) || 0),
    grossWeightKg: numOrEmpty(row.grossWeightKg),
    volumeCbm: numOrEmpty(row.volumeCbm),
    dimensionsCm: String(row.dimensionsCm || '').trim() || undefined,
  }))
}

/** Totals from cargo lines when the single “header” cargo block is not used (FreightDesk flow). */
export function aggregateCargoLinesForHeader(lines) {
  if (!lines?.length) return {}
  let totalQty = 0
  let qtyAny = false
  let totalKg = 0
  let kgAny = false
  let totalCbm = 0
  let cbmAny = false
  for (const row of lines) {
    const q = row.quantity
    if (q !== undefined && q !== null && Number.isFinite(Number(q))) {
      totalQty += Number(q)
      qtyAny = true
    }
    const kg = row.grossWeightKg
    if (kg !== undefined && kg !== null && Number.isFinite(Number(kg))) {
      totalKg += Number(kg)
      kgAny = true
    }
    const cbm = row.volumeCbm
    if (cbm !== undefined && cbm !== null && Number.isFinite(Number(cbm))) {
      totalCbm += Number(cbm)
      cbmAny = true
    }
  }
  const packs = lines.map((r) => r.packagingType).filter(Boolean)
  let packagingType
  if (packs.length) {
    const p0 = String(packs[0])
    packagingType = packs.every((p) => String(p) === p0) ? p0 : undefined
  }
  return {
    numPackages: qtyAny ? totalQty : undefined,
    grossWeightKg: kgAny ? totalKg : undefined,
    volumeCbm: cbmAny ? totalCbm : undefined,
    packagingType,
  }
}

function pickAggregatedOrForm(formVal, aggregated) {
  const f = numOrEmpty(formVal)
  if (f !== undefined) return f
  return aggregated !== undefined ? aggregated : undefined
}

function mergeTagsForStore(form) {
  const s = new Set(form.additionalServiceTags || [])
  if (form.insuranceRequired === 'yes') s.add('Cargo Insurance')
  if (form.customsClearanceOrigin === 'yes') s.add('Customs Clearance (Origin)')
  if (form.customsClearanceDestination === 'yes') s.add('Customs Clearance (Dest.)')
  return [...s].filter(Boolean)
}

function complianceBooleansFromForm(form) {
  const tags = new Set(form.additionalServiceTags || [])
  return {
    insuranceRequired:
      tags.has('Cargo Insurance') || form.insuranceRequired === 'yes' ? 'yes' : 'no',
    customsClearanceOrigin:
      tags.has('Customs Clearance (Origin)') || form.customsClearanceOrigin === 'yes' ? 'yes' : 'no',
    customsClearanceDestination:
      tags.has('Customs Clearance (Dest.)') || form.customsClearanceDestination === 'yes' ? 'yes' : 'no',
  }
}

export function buildEnquiryPayload(form) {
  const lineItems = (form.lineItems || []).map((li) => ({
    id: li.id || nanoid(),
    description: String(li.description || '').trim(),
    quantity: Math.max(1, Number(li.quantity) || 1),
    assignedPricingUserIds: [...new Set(li.assignedPricingUserIds || [])],
  }))
  const cargoLinesNorm = normalizeCargoLinesForStore(form.cargoLines)
  const agg = aggregateCargoLinesForHeader(cargoLinesNorm)
  const mergedNumPackages = pickAggregatedOrForm(form.numPackages, agg.numPackages)
  const mergedGrossKg = pickAggregatedOrForm(form.grossWeightKg, agg.grossWeightKg)
  const mergedCbm = pickAggregatedOrForm(form.volumeCbm, agg.volumeCbm)
  const hasSubstantiveCargoLine = cargoLinesNorm.some(
    (row) =>
      String(row.description || '').trim() ||
      row.quantity != null ||
      row.grossWeightKg != null ||
      row.volumeCbm != null,
  )
  /** If lines carry data and agree on packaging, use that; otherwise keep the header field (legacy form). */
  const mergedPackaging =
    hasSubstantiveCargoLine && agg.packagingType
      ? agg.packagingType
      : String(form.packagingType || '').trim() || agg.packagingType || undefined

  const compliance = complianceBooleansFromForm(form)
  const tagsOut = mergeTagsForStore({ ...form, ...compliance })

  let commodity = String(form.commodityDescription || '').trim()
  if (!commodity) {
    const joined = cargoLinesNorm.map((c) => c.description).filter(Boolean).join('; ')
    if (joined) commodity = joined.slice(0, 2000)
  }
  const internalNotes = String(form.internalNotes || '').trim()
  const declared = numOrEmpty(form.declaredValueUsd)
  const targetFromDeclared =
    form.targetBudget === '' || form.targetBudget == null
      ? declared != null
        ? String(declared)
        : ''
      : form.targetBudget

  return {
    ...form,
    enquiryId: form.enquiryId?.trim() || useAppStore.getState().consumeNextDisplayCode('enquiry'),
    inquiryDate: form.inquiryDate || undefined,
    enquiryTemplate: form.enquiryTemplate || inferEnquiryTemplate(form.serviceType, form.shipmentType),
    salesChannel: String(form.salesChannel || '').trim() || undefined,
    numPackages: mergedNumPackages,
    dimLengthCm: numOrEmpty(form.dimLengthCm),
    dimWidthCm: numOrEmpty(form.dimWidthCm),
    dimHeightCm: numOrEmpty(form.dimHeightCm),
    grossWeightKg: mergedGrossKg,
    grossWeightTons: numOrEmpty(form.grossWeightTons),
    netWeightKg: numOrEmpty(form.netWeightKg),
    weightPerPackageKg: numOrEmpty(form.weightPerPackageKg),
    volumeCbm: mergedCbm,
    dimensionsDescription: String(form.dimensionsDescription || '').trim() || undefined,
    cargoReadiness: String(form.cargoReadiness || '').trim() || undefined,
    enquiryRemarks: String(form.enquiryRemarks || '').trim() || undefined,
    requiredSchedule: String(form.requiredSchedule || '').trim() || undefined,
    enquiryReceivedAt: normalizeDatetimeLocalForStore(form.enquiryReceivedAt) || undefined,
    quoteSentAt: normalizeDatetimeLocalForStore(form.quoteSentAt) || undefined,
    airChargeableWeightKg: numOrEmpty(form.airChargeableWeightKg),
    seaContainerCount: numOrEmpty(form.seaContainerCount),
    targetBudget: numOrEmpty(targetFromDeclared),
    expectedValue: targetFromDeclared === '' || targetFromDeclared == null ? 0 : Number(targetFromDeclared) || 0,
    commodityDescription: commodity,
    description: commodity,
    packagingType: mergedPackaging || 'cartons',
    notes: internalNotes,
    internalNotes,
    lineItems,
    assignedPricingUserIds: [...(form.assignedPricingUserIds || [])],
    attachHasInvoice: Boolean(form.attachHasInvoice),
    attachHasPackingList: Boolean(form.attachHasPackingList),
    attachHasMsds: Boolean(form.attachHasMsds),
    assignedSalesUserId: String(form.assignedSalesUserId || '').trim() || undefined,

    cargoLines: cargoLinesNorm,
    routePolText: String(form.routePolText || '').trim() || undefined,
    routePodText: String(form.routePodText || '').trim() || undefined,
    enquiryValidUntil: form.enquiryValidUntil?.trim() || undefined,
    declaredValueUsd: declared != null ? declared : undefined,
    additionalServiceTags: tagsOut,
    insuranceRequired: compliance.insuranceRequired,
    customsClearanceOrigin: compliance.customsClearanceOrigin,
    customsClearanceDestination: compliance.customsClearanceDestination,
  }
}

export function cloneForm(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/** Get price rows for a pricing user and line item */
export function getPricesForLine(enquiry, userId, lineItemId) {
  const byUser = enquiry.pricingByUser?.[userId]
  if (!byUser) return []
  return byUser[lineItemId] || []
}
