/** Excel workbook layouts: SEA EXPORTS, SEA IMPORTS, AIR EXPORTS, AIR IMPORTS, OTHERS */

export const ENQUIRY_TEMPLATE_IDS = ['sea_export', 'sea_import', 'air_export', 'air_import', 'others']

export const ENQUIRY_TEMPLATE_OPTIONS = [
  { value: 'sea_export', label: 'Sea export' },
  { value: 'sea_import', label: 'Sea import' },
  { value: 'air_export', label: 'Air export' },
  { value: 'air_import', label: 'Air import' },
  { value: 'others', label: 'Others' },
]

const TEMPLATE_SERVICE_SHIPMENT = {
  sea_export: { serviceType: 'sea', shipmentType: 'export' },
  sea_import: { serviceType: 'sea', shipmentType: 'import' },
  air_export: { serviceType: 'air', shipmentType: 'export' },
  air_import: { serviceType: 'air', shipmentType: 'import' },
  others: { serviceType: 'sea', shipmentType: 'export' },
}

/**
 * @param {string} serviceType
 * @param {string} shipmentType
 * @returns {string}
 */
export function inferEnquiryTemplate(serviceType, shipmentType) {
  const k = `${serviceType}|${shipmentType}`
  const map = {
    'sea|export': 'sea_export',
    'sea|import': 'sea_import',
    'air|export': 'air_export',
    'air|import': 'air_import',
  }
  return map[k] || 'others'
}

/**
 * @param {string} templateId
 */
export function getServiceShipmentForTemplate(templateId) {
  return TEMPLATE_SERVICE_SHIPMENT[templateId] || TEMPLATE_SERVICE_SHIPMENT.others
}

/**
 * @param {string} templateId
 */
export function getTemplateUi(templateId) {
  const isSea = templateId === 'sea_export' || templateId === 'sea_import'
  const isAir = templateId === 'air_export' || templateId === 'air_import'
  const polPod =
    isSea || isAir
      ? {
          originPortLabel: 'POL (port / airport code)',
          destPortLabel: 'POD (port / airport code)',
        }
      : {
          originPortLabel: 'Port / airport code',
          destPortLabel: 'Port / airport code',
        }

  return {
    ...polPod,
    /** Incoterms row placed before service/shipment (Excel import & air sheets). */
    incotermsFirst:
      templateId === 'sea_import' ||
      templateId === 'air_export' ||
      templateId === 'air_import' ||
      templateId === 'others',
    showGrossWeightTons: templateId === 'sea_export' || templateId === 'sea_import' || templateId === 'others',
    showDimensionsText: true,
    showCargoReadinessText: true,
    showRequiredSchedule: templateId === 'sea_import',
    showAirImportExtras: templateId === 'air_import',
    showOthersWorkflow: templateId === 'others',
    numPackagesLabel: templateId === 'air_import' ? 'No. of packages' : 'Number of packages',
    /** Prefer container count label for sea templates (Excel “volume in nos”). */
    volumeNosAsContainerCount: isSea,
    targetBudgetLabel: 'Indication / target budget',
    cutOffEtaLabel: 'Cut-off ETA',
    commodityLabel: 'Commodity',
    enquiryRefLabel: 'Enquiry reference',
    enquiryDateLabel: 'Enquiry date',
    modeTypeHint: 'FCL / LCL / Break-bulk (sea), FTL/LTL (road), etc.',
  }
}

export const SALES_CHANNEL_OPTIONS = [
  { value: '', label: '—' },
  { value: 'sales', label: 'Sales' },
  { value: 'corporate', label: 'Corporate' },
]
