import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { STORAGE_KEY } from '../services/storageService'
import {
  readUsers,
  createUserRecord,
  updateUserRecord,
  deleteUserRecord,
  ensureUsersSeeded,
  migrateLegacyUsersIfNeeded,
  resetUsersToSeed,
  seedUsersDefault,
} from '../services/usersJsonStorage'
import { createDefaultEmailTemplates } from '../services/defaultEmailTemplates'
import { isApiMode } from '../services/apiMode'
import * as crmApi from '../services/crmApi'
import { I18N_DEFAULT_LOCALE, I18N_ALL_CODES } from '../i18n/languages'
import {
  CODE_MODULE_KEYS,
  defaultCodeConventions,
  formatBusinessCode,
  normalizeModuleConvention,
} from '../services/businessCodeGenerator'
import {
  CHROME_THEME_FREIGHT_DESK,
  applyChromeThemeToDocument,
  normalizeChromeTheme,
} from '../theme/chromeThemes'

function sortLocalesByCatalog(codes) {
  const set = new Set(codes)
  return I18N_ALL_CODES.filter((c) => set.has(c))
}

let brevoApiSyncTimer = null
function scheduleBrevoSettingsSync(get) {
  if (!isApiMode()) return
  clearTimeout(brevoApiSyncTimer)
  brevoApiSyncTimer = setTimeout(async () => {
    brevoApiSyncTimer = null
    try {
      await crmApi.apiPutBrevoSettings(get().brevoSettings)
    } catch (e) {
      console.warn('Brevo settings sync failed', e)
    }
  }, 750)
}

function nowIso() {
  return new Date().toISOString()
}

const initialAuth = () => ({ token: null, user: null })

/** @deprecated use seedUsersDefault from usersJsonStorage — kept for external imports */
export function seedUsers() {
  return seedUsersDefault()
}

function getInitialUsers() {
  if (typeof localStorage === 'undefined') return []
  ensureUsersSeeded()
  return readUsers()
}

/** Session `role` present and non-empty (legacy sessions may omit `role`). */
function hasSessionRole(role) {
  return role != null && String(role).trim() !== ''
}

function defaultBrevoSettings() {
  return {
    apiKey: '',
    senderEmail: '',
    senderName: '',
    replyToEmail: '',
    organizationName: '',
  }
}

function defaultBranding() {
  return {
    logoUrl: '',
    logoAlt: 'Company logo',
    logoMaxWidthPx: 160,
    companyName: '',
    accentColor: '#2563eb',
    headerTagline: '',
    footerNote: '',
  }
}

function normalizeEmailTemplate(t) {
  return {
    ...t,
    branding: { ...defaultBranding(), ...(t.branding || {}) },
    isDefault: Boolean(t.isDefault),
  }
}

function mergePersistedCodeConventions(raw) {
  const defs = defaultCodeConventions()
  if (!raw || typeof raw !== 'object') return defs
  return {
    enquiry: normalizeModuleConvention({ ...defs.enquiry, ...raw.enquiry }, 'enquiry'),
    quotation: normalizeModuleConvention({ ...defs.quotation, ...raw.quotation }, 'quotation'),
    invoice: normalizeModuleConvention({ ...defs.invoice, ...raw.invoice }, 'invoice'),
  }
}

function mergePersistedCodeCounters(raw) {
  const z = { enquiry: 0, quotation: 0, invoice: 0 }
  if (!raw || typeof raw !== 'object') return z
  return {
    enquiry: Math.max(0, Math.floor(Number(raw.enquiry) || 0)),
    quotation: Math.max(0, Math.floor(Number(raw.quotation) || 0)),
    invoice: Math.max(0, Math.floor(Number(raw.invoice) || 0)),
  }
}

function normalizeCargoLinesInEnquiry(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  return raw.map((row) => ({
    id: row.id || nanoid(),
    description: String(row.description || '').trim(),
    packagingType: String(row.packagingType || 'cartons'),
    quantity: row.quantity === undefined || row.quantity === null ? undefined : Number(row.quantity),
    grossWeightKg: row.grossWeightKg === undefined || row.grossWeightKg === null ? undefined : Number(row.grossWeightKg),
    volumeCbm: row.volumeCbm === undefined || row.volumeCbm === null ? undefined : Number(row.volumeCbm),
    dimensionsCm: row.dimensionsCm != null ? String(row.dimensionsCm) : undefined,
  }))
}

function normalizeEnquiry(e) {
  const lineItems =
    e.lineItems?.length > 0
      ? e.lineItems.map((li) => ({
          ...li,
          id: li.id || nanoid(),
          quantity: Math.max(1, Number(li.quantity) || 1),
          assignedPricingUserIds: Array.isArray(li.assignedPricingUserIds) ? [...new Set(li.assignedPricingUserIds)] : [],
        }))
      : [
          {
            id: nanoid(),
            description: (e.commodityDescription || e.description || '').trim().slice(0, 500) || 'Line 1',
            quantity: 1,
            assignedPricingUserIds: [],
          },
        ]
  const cargoLines = normalizeCargoLinesInEnquiry(e.cargoLines)
  return {
    ...e,
    lineItems,
    cargoLines,
    additionalServiceTags: Array.isArray(e.additionalServiceTags) ? e.additionalServiceTags : [],
    assignedPricingUserIds: Array.isArray(e.assignedPricingUserIds) ? e.assignedPricingUserIds : [],
    pricingByUser: e.pricingByUser && typeof e.pricingByUser === 'object' ? e.pricingByUser : {},
  }
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      /** Synced from `usersJsonStorage` (local JSON). Not persisted inside zustand blob. */
      users: getInitialUsers(),
      clients: [],
      enquiries: [],
      quotations: [],
      invoices: [],
      auth: initialAuth(),
      uiTheme: 'light',
      /** Visual chrome: FreightDesk (default) or Vuestic. */
      chromeTheme: CHROME_THEME_FREIGHT_DESK,
      /** BCP 47 locale; must be one of `enabledLocales`. */
      locale: I18N_DEFAULT_LOCALE,
      /** Subset of `I18N_ALL_CODES`; at least one code. */
      enabledLocales: [...I18N_ALL_CODES],
      /** Prefix / suffix / digits / date segment for enquiryId, quoteId, invoiceId. */
      codeConventions: defaultCodeConventions(),
      /** Last used sequence per module; next id uses last+1. */
      codeCounters: { enquiry: 0, quotation: 0, invoice: 0 },
      brevoSettings: defaultBrevoSettings(),
      emailTemplates: createDefaultEmailTemplates().map(normalizeEmailTemplate),

      /** Call after load / import — reads `logistics-crm-users.json` from localStorage. */
      hydrateUsersFromJson: () => {
        if (isApiMode()) return
        ensureUsersSeeded()
        const users = readUsers()
        set((s) => {
          const auth = s.auth
          if (
            auth?.token &&
            auth?.user?.email &&
            !hasSessionRole(auth.user.role)
          ) {
            const u = users.find(
              (x) => x.email.toLowerCase() === String(auth.user.email).toLowerCase(),
            )
            if (hasSessionRole(u?.role)) {
              return {
                users,
                auth: {
                  token: auth.token,
                  user: { id: u.id, email: u.email, name: u.name, role: u.role },
                },
              }
            }
          }
          return { users }
        })
      },

      setUiTheme: (uiTheme) => {
        set({ uiTheme })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', uiTheme === 'dark')
        }
      },

      setChromeTheme: (chromeTheme) => {
        const next = normalizeChromeTheme(chromeTheme)
        set({ chromeTheme: next })
        applyChromeThemeToDocument(next)
      },

      setI18nLocale: (code) => {
        const c = String(code || '').trim()
        if (!I18N_ALL_CODES.includes(c)) return
        set((s) => {
          if (!s.enabledLocales.includes(c)) return {}
          return { locale: c }
        })
      },

      setI18nEnabledLocales: (codes) => {
        const sorted = sortLocalesByCatalog(Array.isArray(codes) ? codes : [])
        const enabled = sorted.length > 0 ? sorted : [...I18N_ALL_CODES]
        set((s) => ({
          enabledLocales: enabled,
          locale: enabled.includes(s.locale) ? s.locale : enabled[0],
        }))
      },

      toggleI18nLocaleEnabled: (code, wantEnabled) => {
        const c = String(code || '').trim()
        if (!I18N_ALL_CODES.includes(c)) return
        set((s) => {
          if (wantEnabled) {
            if (s.enabledLocales.includes(c)) return {}
            const next = sortLocalesByCatalog([...s.enabledLocales, c])
            return { enabledLocales: next }
          }
          if (s.enabledLocales.length <= 1) return {}
          const next = s.enabledLocales.filter((x) => x !== c)
          if (next.length === 0) return {}
          return {
            enabledLocales: next,
            locale: next.includes(s.locale) ? s.locale : next[0],
          }
        })
      },

      consumeNextDisplayCode: (moduleKey) => {
        if (!CODE_MODULE_KEYS.includes(moduleKey)) {
          return `REF-${nanoid(8)}`
        }
        let result = `REF-${nanoid(8)}`
        set((s) => {
          const cur = s.codeCounters[moduleKey] ?? 0
          const nextSeq = cur + 1
          result = formatBusinessCode(moduleKey, nextSeq, s.codeConventions)
          return {
            codeCounters: { ...s.codeCounters, [moduleKey]: nextSeq },
          }
        })
        return result
      },

      setCodeConvention: (moduleKey, partial) => {
        if (!CODE_MODULE_KEYS.includes(moduleKey)) return
        set((s) => ({
          codeConventions: {
            ...s.codeConventions,
            [moduleKey]: normalizeModuleConvention(
              { ...s.codeConventions[moduleKey], ...partial },
              moduleKey,
            ),
          },
        }))
      },

      resetCodeCounters: () => set({ codeCounters: { enquiry: 0, quotation: 0, invoice: 0 } }),

      /**
       * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
       */
      login: async (email, password = '') => {
        const em = String(email).trim().toLowerCase()
        if (!isApiMode()) {
          const list = get().users || []
          const u = list.find((x) => x.email.toLowerCase() === em)
          if (!u) {
            return { ok: false, error: 'No user with that email. An admin must create your account first.' }
          }
          const token = nanoid()
          set({
            auth: {
              token,
              user: { id: u.id, email: u.email, name: u.name, role: u.role },
            },
          })
          return { ok: true }
        }
        try {
          const { access_token: accessToken } = await crmApi.apiLogin(em, password || undefined)
          set({ auth: { token: accessToken, user: null } })
          const me = await crmApi.apiFetchMe()
          set({
            auth: {
              token: accessToken,
              user: { id: me.id, email: me.email, name: me.name, role: me.role },
            },
          })
          await get().bootstrapFromApi()
          return { ok: true }
        } catch (e) {
          const d = e?.response?.data?.detail
          const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => x.msg).join(', ') : e?.message
          return { ok: false, error: msg || 'Login failed' }
        }
      },

      bootstrapFromApi: async () => {
        if (!isApiMode()) return
        const b = await crmApi.apiBootstrap()
        set({
          clients: b.clients,
          enquiries: b.enquiries.map((row) => normalizeEnquiry({ ...row, id: row.id })),
          quotations: b.quotations,
          invoices: b.invoices,
          users: b.users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            avatar_url: u.avatar_url ?? null,
            createdAt: u.createdAt || nowIso(),
          })),
          brevoSettings: { ...defaultBrevoSettings(), ...b.brevoSettings },
          emailTemplates:
            b.emailTemplates?.length > 0
              ? b.emailTemplates.map(normalizeEmailTemplate)
              : createDefaultEmailTemplates().map(normalizeEmailTemplate),
        })
      },

      logout: () => set({ auth: initialAuth() }),

      clearAllData: () => {
        if (isApiMode()) {
          set({ auth: initialAuth() })
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark')
          }
          return
        }
        resetUsersToSeed()
        set({
          users: readUsers(),
          clients: [],
          enquiries: [],
          quotations: [],
          invoices: [],
          auth: initialAuth(),
          uiTheme: 'light',
          chromeTheme: CHROME_THEME_FREIGHT_DESK,
          locale: I18N_DEFAULT_LOCALE,
          enabledLocales: [...I18N_ALL_CODES],
          codeConventions: defaultCodeConventions(),
          codeCounters: { enquiry: 0, quotation: 0, invoice: 0 },
          brevoSettings: defaultBrevoSettings(),
          emailTemplates: createDefaultEmailTemplates().map(normalizeEmailTemplate),
        })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark')
          applyChromeThemeToDocument(CHROME_THEME_FREIGHT_DESK)
        }
      },

      // —— Users (JSON file + in-memory sync; swap service for API later) ——
      addUser: async (payload) => {
        if (isApiMode()) {
          const row = await crmApi.apiCreateUser({
            email: payload.email,
            name: payload.name,
            role: payload.role,
            id: payload.id || undefined,
          })
          set((s) => ({
            users: [...s.users, { ...row, createdAt: row.createdAt || nowIso() }],
          }))
          return row
        }
        const row = createUserRecord(payload)
        set({ users: readUsers() })
        return row
      },

      updateUser: async (id, payload) => {
        if (isApiMode()) {
          const row = await crmApi.apiUpdateUser(id, {
            email: payload.email,
            name: payload.name,
            role: payload.role,
            avatar_url: payload.avatar_url?.trim() || null,
          })
          set((s) => ({
            users: s.users.map((u) => (u.id === id ? { ...u, ...row, createdAt: u.createdAt } : u)),
          }))
          return
        }
        updateUserRecord(id, payload)
        set({ users: readUsers() })
      },

      deleteUser: async (id) => {
        if (isApiMode()) {
          await crmApi.apiDeleteUser(id)
          set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
          return
        }
        deleteUserRecord(id)
        set({ users: readUsers() })
      },

      // —— Clients ——
      addClient: async (payload) => {
        if (isApiMode()) {
          const row = await crmApi.apiCreateClient({
            ...payload,
            createdAt: payload.createdAt || nowIso(),
          })
          set((s) => ({ clients: [...s.clients, row] }))
          return row
        }
        const id = nanoid()
        const row = {
          id,
          ...payload,
          createdAt: payload.createdAt || nowIso(),
        }
        set((s) => ({ clients: [...s.clients, row] }))
        return row
      },

      updateClient: async (id, payload) => {
        if (isApiMode()) {
          const row = await crmApi.apiUpdateClient(id, { ...payload, id })
          set((s) => ({
            clients: s.clients.map((c) => (c.id === id ? row : c)),
          }))
          return
        }
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...payload, id } : c)),
        }))
      },

      deleteClient: async (id) => {
        const { enquiries, quotations, invoices } = get()
        const refs = []
        if (enquiries.some((e) => e.clientId === id)) refs.push('enquiries')
        if (quotations.some((q) => q.clientId === id)) refs.push('quotations')
        if (invoices.some((i) => i.clientId === id)) refs.push('invoices')
        if (refs.length) {
          return {
            ok: false,
            error: `Cannot delete: client is referenced by ${refs.join(', ')}. Remove those records first.`,
          }
        }
        if (isApiMode()) {
          await crmApi.apiDeleteClient(id)
        }
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
        return { ok: true }
      },

      // —— Enquiries ——
      addEnquiry: async (payload) => {
        if (isApiMode()) {
          const id = nanoid()
          const base = normalizeEnquiry({ ...payload, id })
          const body = { ...base, id, createdAt: payload.createdAt || nowIso() }
          const row = await crmApi.apiCreateEnquiry(body)
          set((s) => ({ enquiries: [...s.enquiries, normalizeEnquiry(row)] }))
          return normalizeEnquiry(row)
        }
        const id = nanoid()
        const base = normalizeEnquiry({ ...payload, id })
        const row = {
          ...base,
          id,
          createdAt: payload.createdAt || nowIso(),
        }
        set((s) => ({ enquiries: [...s.enquiries, row] }))
        return row
      },

      updateEnquiry: async (id, payload) => {
        if (isApiMode()) {
          const cur = get().enquiries.find((e) => e.id === id)
          const merged = normalizeEnquiry({ ...cur, ...payload, id })
          const row = await crmApi.apiUpdateEnquiry(id, merged)
          set((s) => ({
            enquiries: s.enquiries.map((e) => (e.id === id ? normalizeEnquiry(row) : e)),
          }))
          return
        }
        set((s) => ({
          enquiries: s.enquiries.map((e) => {
            if (e.id !== id) return e
            const merged = { ...e, ...payload, id }
            return normalizeEnquiry(merged)
          }),
        }))
      },

      setEnquiryPricingAssignees: async (enquiryId, userIds) => {
        if (isApiMode()) {
          const cur = get().enquiries.find((e) => e.id === enquiryId)
          if (!cur) return
          const row = await crmApi.apiUpdateEnquiry(enquiryId, {
            ...cur,
            assignedPricingUserIds: [...new Set(userIds)],
          })
          set((s) => ({
            enquiries: s.enquiries.map((e) => (e.id === enquiryId ? normalizeEnquiry(row) : e)),
          }))
          return
        }
        set((s) => ({
          enquiries: s.enquiries.map((e) =>
            e.id === enquiryId ? { ...e, assignedPricingUserIds: [...new Set(userIds)] } : e,
          ),
        }))
      },

      deleteEnquiry: async (id) => {
        if (isApiMode()) {
          await crmApi.apiDeleteEnquiry(id)
        }
        set((s) => ({ enquiries: s.enquiries.filter((e) => e.id !== id) }))
      },

      // —— Quotations ——
      addQuotation: async (payload) => {
        if (isApiMode()) {
          const id = nanoid()
          const row = await crmApi.apiCreateQuotation({
            id,
            ...payload,
            clientResponseToken: payload.clientResponseToken || nanoid(32),
            createdAt: payload.createdAt || nowIso(),
          })
          set((s) => ({ quotations: [...s.quotations, row] }))
          return row
        }
        const id = nanoid()
        const row = {
          id,
          ...payload,
          clientResponseToken: payload.clientResponseToken || nanoid(32),
          createdAt: payload.createdAt || nowIso(),
        }
        set((s) => ({ quotations: [...s.quotations, row] }))
        return row
      },

      /**
       * Client-facing accept / reject from email link (same browser session / persisted store).
       * @returns {{ ok: true } | { ok: false, error: string }}
       */
      respondToQuotationClient: async ({ id, token, action }) => {
        const t = String(token || '').trim()
        const next = action === 'accept' ? 'Accepted' : 'Rejected'
        if (action !== 'accept' && action !== 'reject') {
          return { ok: false, error: 'Invalid action.' }
        }
        if (isApiMode()) {
          try {
            const base = import.meta.env.VITE_API_BASE_URL
            await crmApi.apiPublicQuotationRespond(base, id, t, action)
            return { ok: true }
          } catch (e) {
            const msg = e?.message || 'Could not record response.'
            if (e?.status === 403) return { ok: false, error: 'This response link is invalid or has expired.' }
            if (e?.status === 404) return { ok: false, error: 'Quotation not found.' }
            if (e?.status === 409) return { ok: false, error: 'This quotation has already been accepted or declined.' }
            return { ok: false, error: msg }
          }
        }
        const q = get().quotations.find((x) => x.id === id)
        if (!q) return { ok: false, error: 'Quotation not found.' }
        if (!q.clientResponseToken || q.clientResponseToken !== t) {
          return { ok: false, error: 'This response link is invalid or has expired.' }
        }
        if (q.status === 'Accepted' || q.status === 'Rejected') {
          return { ok: false, error: 'This quotation has already been accepted or declined.' }
        }
        set((s) => ({
          quotations: s.quotations.map((x) =>
            x.id === id
              ? { ...x, status: next, clientRespondedAt: nowIso(), clientResponseAction: next }
              : x,
          ),
        }))
        return { ok: true }
      },

      updateQuotation: async (id, payload) => {
        if (isApiMode()) {
          const cur = get().quotations.find((q) => q.id === id)
          const row = await crmApi.apiUpdateQuotation(id, { ...cur, ...payload, id })
          set((s) => ({
            quotations: s.quotations.map((q) => (q.id === id ? row : q)),
          }))
          return
        }
        set((s) => ({
          quotations: s.quotations.map((q) => (q.id === id ? { ...q, ...payload, id } : q)),
        }))
      },

      deleteQuotation: async (id) => {
        if (isApiMode()) {
          await crmApi.apiDeleteQuotation(id)
        }
        set((s) => ({ quotations: s.quotations.filter((q) => q.id !== id) }))
      },

      // —— Invoices ——
      addInvoice: async (payload) => {
        if (isApiMode()) {
          const id = nanoid()
          const row = await crmApi.apiCreateInvoice({
            id,
            ...payload,
            createdAt: payload.createdAt || nowIso(),
          })
          set((s) => ({ invoices: [...s.invoices, row] }))
          return row
        }
        const id = nanoid()
        const row = {
          id,
          ...payload,
          createdAt: payload.createdAt || nowIso(),
        }
        set((s) => ({ invoices: [...s.invoices, row] }))
        return row
      },

      updateInvoice: async (id, payload) => {
        if (isApiMode()) {
          const cur = get().invoices.find((i) => i.id === id)
          const row = await crmApi.apiUpdateInvoice(id, { ...cur, ...payload, id })
          set((s) => ({
            invoices: s.invoices.map((inv) => (inv.id === id ? row : inv)),
          }))
          return
        }
        set((s) => ({
          invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...payload, id } : inv)),
        }))
      },

      deleteInvoice: async (id) => {
        if (isApiMode()) {
          await crmApi.apiDeleteInvoice(id)
        }
        set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }))
      },

      setBrevoSettings: (partial) => {
        set((s) => {
          const next = { ...defaultBrevoSettings(), ...s.brevoSettings, ...partial }
          return { brevoSettings: next }
        })
        scheduleBrevoSettingsSync(get)
      },

      resetEmailTemplatesToDefaults: () => {
        set({ emailTemplates: createDefaultEmailTemplates().map(normalizeEmailTemplate) })
      },

      addEmailTemplate: async (payload) => {
        const id = nanoid()
        const category = payload.category
        const existing = get().emailTemplates.filter((t) => t.category === category)
        const wantsDefault = Boolean(payload.isDefault) || existing.length === 0
        const row = normalizeEmailTemplate({
          id,
          category,
          name: String(payload.name || 'Untitled').trim() || 'Untitled',
          subjectTemplate: String(payload.subjectTemplate ?? ''),
          bodyHtmlTemplate: String(payload.bodyHtmlTemplate ?? ''),
          isDefault: wantsDefault,
          branding: { ...defaultBranding(), ...(payload.branding || {}) },
        })
        if (isApiMode()) {
          const inCat = get().emailTemplates.filter((t) => t.category === category)
          if (wantsDefault && inCat.length) {
            await Promise.all(
              inCat.map((x) => crmApi.apiUpdateEmailTemplate(x.id, { ...x, isDefault: false })),
            )
          }
          const created = await crmApi.apiCreateEmailTemplate({ ...row })
          const norm = normalizeEmailTemplate(created)
          set((s) => {
            let list = s.emailTemplates.map((t) =>
              wantsDefault && t.category === category ? { ...t, isDefault: false } : t,
            )
            list = [...list, norm]
            return { emailTemplates: list }
          })
          return norm
        }
        set((s) => {
          let list = s.emailTemplates.map((t) =>
            wantsDefault && t.category === category ? { ...t, isDefault: false } : t,
          )
          list = [...list, row]
          return { emailTemplates: list }
        })
        return row
      },

      updateEmailTemplate: async (id, payload) => {
        if (isApiMode()) {
          const cur = get().emailTemplates.find((t) => t.id === id)
          if (!cur) return
          const next = normalizeEmailTemplate({
            ...cur,
            ...payload,
            id,
            branding: payload.branding ? { ...cur.branding, ...payload.branding } : cur.branding,
          })
          const saved = await crmApi.apiUpdateEmailTemplate(id, { ...next })
          const norm = normalizeEmailTemplate(saved)
          set((s) => {
            let merged = s.emailTemplates.map((t) => (t.id === id ? norm : t))
            if (norm.isDefault) {
              merged = merged.map((t) =>
                t.category === norm.category ? { ...t, isDefault: t.id === id } : t,
              )
            }
            return { emailTemplates: merged }
          })
          return
        }
        set((s) => {
          const merged = s.emailTemplates.map((t) => {
            if (t.id !== id) return t
            const next = {
              ...t,
              ...payload,
              id,
              branding: payload.branding ? { ...t.branding, ...payload.branding } : t.branding,
            }
            return normalizeEmailTemplate(next)
          })
          const row = merged.find((t) => t.id === id)
          if (row?.isDefault) {
            return {
              emailTemplates: merged.map((t) =>
                t.category === row.category ? { ...t, isDefault: t.id === id } : t,
              ),
            }
          }
          return { emailTemplates: merged }
        })
      },

      deleteEmailTemplate: async (id) => {
        const t = get().emailTemplates.find((x) => x.id === id)
        if (!t) return
        if (isApiMode()) {
          await crmApi.apiDeleteEmailTemplate(id)
        }
        set((s) => {
          const list = s.emailTemplates.filter((x) => x.id !== id)
          const same = list.filter((x) => x.category === t.category)
          if (t.isDefault && same.length) {
            const pickId = same[0].id
            return {
              emailTemplates: list.map((x) =>
                x.category === t.category ? { ...x, isDefault: x.id === pickId } : x,
              ),
            }
          }
          return { emailTemplates: list }
        })
      },

      setDefaultEmailTemplate: async (id) => {
        const t = get().emailTemplates.find((x) => x.id === id)
        if (!t) return
        if (isApiMode()) {
          const sameCat = get().emailTemplates.filter((x) => x.category === t.category)
          await Promise.all(
            sameCat.map((x) =>
              crmApi.apiUpdateEmailTemplate(x.id, {
                ...x,
                isDefault: x.id === id,
              }),
            ),
          )
        }
        set((s) => ({
          emailTemplates: s.emailTemplates.map((x) =>
            x.category === t.category ? { ...x, isDefault: x.id === id } : x,
          ),
        }))
      },
    }),
    {
      name: STORAGE_KEY,
      version: 9,
      partialize: (state) => {
        const api = isApiMode()
        const base = {
          auth: state.auth,
          uiTheme: state.uiTheme,
          chromeTheme: state.chromeTheme,
          locale: state.locale,
          enabledLocales: state.enabledLocales,
          codeConventions: state.codeConventions,
          codeCounters: state.codeCounters,
        }
        if (api) return base
        return {
          ...base,
          clients: state.clients,
          enquiries: state.enquiries,
          quotations: state.quotations,
          invoices: state.invoices,
          brevoSettings: state.brevoSettings,
          emailTemplates: state.emailTemplates,
        }
      },
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState
        const next = { ...persistedState }
        if (version < 2) {
          next.enquiries = (next.enquiries || []).map((e) => normalizeEnquiry(e))
        }
        if (version < 3) {
          migrateLegacyUsersIfNeeded(next.users)
          delete next.users
          ensureUsersSeeded()
        }
        if (version < 4) {
          next.brevoSettings = next.brevoSettings || defaultBrevoSettings()
          const tpl = next.emailTemplates
          next.emailTemplates = Array.isArray(tpl) && tpl.length
            ? tpl.map(normalizeEmailTemplate)
            : createDefaultEmailTemplates().map(normalizeEmailTemplate)
        }
        if (version < 5) {
          next.quotations = (next.quotations || []).map((q) => ({
            ...q,
            clientResponseToken: q.clientResponseToken || nanoid(32),
          }))
        }
        if (version < 6 && isApiMode()) {
          delete next.clients
          delete next.enquiries
          delete next.quotations
          delete next.invoices
          delete next.brevoSettings
          delete next.emailTemplates
        }
        if (version < 7) {
          const enabled = sortLocalesByCatalog(
            Array.isArray(next.enabledLocales) ? next.enabledLocales : I18N_ALL_CODES,
          )
          next.enabledLocales = enabled.length > 0 ? enabled : [...I18N_ALL_CODES]
          const loc =
            typeof next.locale === 'string' && I18N_ALL_CODES.includes(next.locale)
              ? next.locale
              : I18N_DEFAULT_LOCALE
          next.locale = next.enabledLocales.includes(loc) ? loc : next.enabledLocales[0]
        }
        if (version < 8) {
          next.codeConventions = mergePersistedCodeConventions(next.codeConventions)
          next.codeCounters = mergePersistedCodeCounters(next.codeCounters)
        }
        if (version < 9) {
          next.chromeTheme = normalizeChromeTheme(next.chromeTheme)
        }
        return next
      },
      onRehydrateStorage: () => (state) => {
        if (typeof document !== 'undefined') {
          if (state?.uiTheme === 'dark') document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
          applyChromeThemeToDocument(state?.chromeTheme ?? CHROME_THEME_FREIGHT_DESK)
        }
        queueMicrotask(() => {
          useAppStore.getState().hydrateUsersFromJson()
        })
      },
    },
  ),
)
