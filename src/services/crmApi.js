import { apiClient } from './apiClient'

/** @returns {Promise<{ access_token: string }>} */
export async function apiLogin(email, password) {
  const { data } = await apiClient.post('/api/auth/login', {
    email,
    ...(password ? { password } : {}),
  })
  return data
}

export async function apiFetchMe() {
  const { data } = await apiClient.get('/api/auth/me')
  return data
}

export async function apiBootstrap() {
  const [clients, enquiries, quotations, invoices, users, brevo, ui, templates] = await Promise.all([
    apiClient.get('/api/clients'),
    apiClient.get('/api/enquiries'),
    apiClient.get('/api/quotations'),
    apiClient.get('/api/invoices'),
    apiClient.get('/api/users'),
    apiClient.get('/api/settings/brevo'),
    apiClient.get('/api/settings/ui'),
    apiClient.get('/api/email-templates'),
  ])
  return {
    clients: clients.data,
    enquiries: enquiries.data,
    quotations: quotations.data,
    invoices: invoices.data,
    users: users.data,
    brevoSettings: brevo.data || {},
    uiSettings: ui.data || {},
    emailTemplates: templates.data || [],
  }
}

export async function apiCreateClient(body) {
  const { data } = await apiClient.post('/api/clients', body)
  return data
}

export async function apiUpdateClient(id, body) {
  const { data } = await apiClient.put(`/api/clients/${id}`, body)
  return data
}

export async function apiDeleteClient(id) {
  await apiClient.delete(`/api/clients/${id}`)
}

export async function apiCreateEnquiry(body) {
  const { data } = await apiClient.post('/api/enquiries', body)
  return data
}

export async function apiUpdateEnquiry(id, body) {
  const { data } = await apiClient.put(`/api/enquiries/${id}`, body)
  return data
}

export async function apiDeleteEnquiry(id) {
  await apiClient.delete(`/api/enquiries/${id}`)
}

export async function apiCreateQuotation(body) {
  const { data } = await apiClient.post('/api/quotations', body)
  return data
}

export async function apiUpdateQuotation(id, body) {
  const { data } = await apiClient.put(`/api/quotations/${id}`, body)
  return data
}

export async function apiDeleteQuotation(id) {
  await apiClient.delete(`/api/quotations/${id}`)
}

export async function apiCreateInvoice(body) {
  const { data } = await apiClient.post('/api/invoices', body)
  return data
}

export async function apiUpdateInvoice(id, body) {
  const { data } = await apiClient.put(`/api/invoices/${id}`, body)
  return data
}

export async function apiDeleteInvoice(id) {
  await apiClient.delete(`/api/invoices/${id}`)
}

export async function apiCreateUser(body) {
  const { data } = await apiClient.post('/api/users', body)
  return data
}

export async function apiUpdateUser(id, body) {
  const { data } = await apiClient.put(`/api/users/${id}`, body)
  return data
}

export async function apiDeleteUser(id) {
  await apiClient.delete(`/api/users/${id}`)
}

export async function apiPutBrevoSettings(body) {
  const { data } = await apiClient.put('/api/settings/brevo', body)
  return data
}

export async function apiPutUiSettings(body) {
  const { data } = await apiClient.put('/api/settings/ui', body)
  return data
}

export async function apiCreateEmailTemplate(body) {
  const { data } = await apiClient.post('/api/email-templates', body)
  return data
}

export async function apiUpdateEmailTemplate(id, body) {
  const { data } = await apiClient.put(`/api/email-templates/${id}`, body)
  return data
}

export async function apiDeleteEmailTemplate(id) {
  await apiClient.delete(`/api/email-templates/${id}`)
}

/**
 * Public quotation respond (no auth).
 * @param {string} baseUrl - same as VITE_API_BASE_URL (no trailing slash)
 */
export async function apiPublicQuotationRespond(baseUrl, quotationId, token, action) {
  const b = String(baseUrl).replace(/\/$/, '')
  const res = await fetch(`${b}/api/public/quotations/${quotationId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action }),
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { detail: text }
  }
  if (!res.ok) {
    const err = new Error(typeof json.detail === 'string' ? json.detail : res.statusText)
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

/** Send Brevo email via server proxy (uses server BREVO_API_KEY). */
export async function apiBrevoSend(payload) {
  const { data } = await apiClient.post('/api/brevo/send', { payload })
  return data
}

export async function apiDemoDataStatus() {
  const { data } = await apiClient.get('/api/admin/demo-data/status')
  return data
}

/** @param {boolean} replace - if true, removes existing sample_* rows first */
export async function apiSeedDemoData(replace = false) {
  const { data } = await apiClient.post('/api/admin/demo-data/seed', { replace })
  return data
}

export async function apiRemoveDemoData() {
  const { data } = await apiClient.delete('/api/admin/demo-data')
  return data
}
