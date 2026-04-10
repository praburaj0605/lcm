export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin — full access' },
  { value: 'sales', label: 'Sales — clients, enquiries, quotations, invoices' },
  { value: 'pricing', label: 'Pricing — assigned enquiries & pricing only' },
  { value: 'boss', label: 'Boss — same access as admin (full CRM + reports)' },
]

export function emptyUser() {
  return { email: '', name: '', role: 'sales', avatar_url: '' }
}

export function validateUser(form) {
  const errors = {}
  if (!form.email?.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email'
  if (!form.name?.trim()) errors.name = 'Name is required'
  if (!form.role) errors.role = 'Role is required'
  return errors
}

export function cloneForm(obj) {
  return JSON.parse(JSON.stringify(obj))
}
