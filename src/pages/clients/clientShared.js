import { resolveCountryCode } from '../../services/locationRegistry'

export function emptyClient() {
  return {
    clientName: '',
    companyName: '',
    logoUrl: '',
    logoAlt: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    gstTaxId: '',
    industry: '',
    contactPersonName: '',
    contactPersonRole: '',
    contactPersonEmail: '',
    notes: '',
    status: 'Active',
  }
}

export function mapClientToForm(c) {
  return {
    clientName: c.clientName ?? '',
    companyName: c.companyName ?? '',
    logoUrl: c.logoUrl ?? '',
    logoAlt: c.logoAlt ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    alternatePhone: c.alternatePhone ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    country: resolveCountryCode(c.country) || c.country || '',
    gstTaxId: c.gstTaxId ?? '',
    industry: c.industry ?? '',
    contactPersonName: c.contactPersonName ?? '',
    contactPersonRole: c.contactPersonRole ?? '',
    contactPersonEmail: c.contactPersonEmail ?? '',
    notes: c.notes ?? '',
    status: c.status ?? 'Active',
  }
}

export function validateClient(data) {
  const errors = {}
  if (!data.clientName?.trim()) errors.clientName = 'Client name is required'
  if (!data.email?.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Invalid email'
  if (!data.phone?.trim()) errors.phone = 'Phone is required'
  return errors
}

export function cloneForm(obj) {
  return JSON.parse(JSON.stringify(obj))
}
