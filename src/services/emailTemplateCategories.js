/** @typedef {'client_email' | 'internal_email' | 'enquiry' | 'quotation' | 'report'} EmailTemplateCategory */

export const EMAIL_TEMPLATE_CATEGORIES = [
  { id: 'client_email', label: 'Client email', description: 'General messages to clients and external contacts' },
  { id: 'internal_email', label: 'Internal email', description: 'Team-only notifications (no external branding wrapper)' },
  { id: 'enquiry', label: 'Enquiries', description: 'Sharing enquiry details' },
  { id: 'quotation', label: 'Quotations', description: 'Sharing quotation details' },
  { id: 'report', label: 'Reports', description: 'Management / summary reports' },
]

export function categoryMeta(id) {
  return EMAIL_TEMPLATE_CATEGORIES.find((c) => c.id === id) || { id, label: id, description: '' }
}

/** Categories where emails may go outside the organisation — logo block applies */
export function isExternalFacingCategory(category) {
  return category !== 'internal_email'
}
