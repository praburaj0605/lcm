/**
 * Users are persisted as JSON in localStorage (browser "file").
 * Replace read/write calls with API requests in a later phase.
 */
import { nanoid } from 'nanoid'

export const USERS_JSON_STORAGE_KEY = 'logistics-crm-users.json'

function nowIso() {
  return new Date().toISOString()
}

/** DiceBear SVG avatar — matches backend demo_image_urls.dicebear_user_avatar. */
export function demoUserAvatarUrl(seed) {
  const q = encodeURIComponent(String(seed).slice(0, 80))
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${q}`
}

export function seedUsersDefault() {
  const t = nowIso()
  return [
    {
      id: 'u_admin',
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'admin',
      avatar_url: demoUserAvatarUrl('admin@demo.com:Admin User'),
      createdAt: t,
    },
    {
      id: 'u_sales',
      email: 'sales@demo.com',
      name: 'Sales Rep',
      role: 'sales',
      avatar_url: demoUserAvatarUrl('sales@demo.com:Sales Rep'),
      createdAt: t,
    },
    {
      id: 'u_pricing1',
      email: 'pricing@demo.com',
      name: 'Pricing Team',
      role: 'pricing',
      avatar_url: demoUserAvatarUrl('pricing@demo.com:Pricing Team'),
      createdAt: t,
    },
    {
      id: 'u_pricing2',
      email: 'pricing2@demo.com',
      name: 'Pricing Analyst',
      role: 'pricing',
      avatar_url: demoUserAvatarUrl('pricing2@demo.com:Pricing Analyst'),
      createdAt: t,
    },
    {
      id: 'u_boss',
      email: 'boss@demo.com',
      name: 'Management (Boss)',
      role: 'boss',
      avatar_url: demoUserAvatarUrl('boss@demo.com:Management'),
      createdAt: t,
    },
  ]
}

/**
 * @returns {{ version: number, updatedAt: string, users: object[] }}
 */
function parseEnvelope(raw) {
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) {
    return { version: 1, updatedAt: nowIso(), users: parsed }
  }
  if (parsed && Array.isArray(parsed.users)) {
    return {
      version: parsed.version ?? 1,
      updatedAt: parsed.updatedAt ?? nowIso(),
      users: parsed.users,
    }
  }
  return { version: 1, updatedAt: nowIso(), users: [] }
}

export function readUsers() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(USERS_JSON_STORAGE_KEY)
    if (!raw || !raw.trim()) return []
    const { users } = parseEnvelope(raw)
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

/**
 * Pretty-printed JSON for easier inspection in DevTools → Application → Local Storage.
 */
export function writeUsers(users) {
  if (typeof localStorage === 'undefined') return
  const envelope = {
    version: 1,
    updatedAt: nowIso(),
    users,
  }
  localStorage.setItem(USERS_JSON_STORAGE_KEY, JSON.stringify(envelope, null, 2))
}

/** Seed demo users when the JSON store is empty. */
export function ensureUsersSeeded() {
  if (readUsers().length === 0) {
    writeUsers(seedUsersDefault())
  }
}

/**
 * One-time migration from legacy zustand-persisted `users` array.
 * @param {object[]|undefined} legacyUsers
 */
export function migrateLegacyUsersIfNeeded(legacyUsers) {
  if (!legacyUsers?.length) return
  if (readUsers().length > 0) return
  writeUsers(legacyUsers.map((u) => ({ ...u })))
}

export function createUserRecord(payload) {
  const list = readUsers()
  const id = nanoid()
  const row = {
    id,
    email: String(payload.email).trim().toLowerCase(),
    name: payload.name?.trim() || 'User',
    role: payload.role,
    avatar_url: payload.avatar_url?.trim() || undefined,
    createdAt: payload.createdAt || nowIso(),
  }
  list.push(row)
  writeUsers(list)
  return row
}

export function updateUserRecord(id, payload) {
  const list = readUsers()
  const next = list.map((u) =>
    u.id === id
      ? {
          ...u,
          ...payload,
          id,
          email: payload.email != null ? String(payload.email).trim().toLowerCase() : u.email,
        }
      : u,
  )
  writeUsers(next)
}

export function deleteUserRecord(id) {
  writeUsers(readUsers().filter((u) => u.id !== id))
}

/** Full replace (e.g. import). Fills missing ids / timestamps. */
export function replaceAllUsers(users) {
  const normalized = users.map((u) => ({
    id: u.id || nanoid(),
    email: String(u.email || '').trim().toLowerCase(),
    name: String(u.name || '').trim() || 'User',
    role: u.role || 'sales',
    avatar_url: u.avatar_url?.trim() || undefined,
    createdAt: u.createdAt || nowIso(),
  }))
  writeUsers(normalized)
}

export function getUsersJsonString() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(USERS_JSON_STORAGE_KEY) : null
  if (raw) return raw
  return JSON.stringify({ version: 1, updatedAt: nowIso(), users: readUsers() }, null, 2)
}

/** Parse pasted or uploaded JSON; accepts envelope or raw array. */
export function parseImportedUsersJson(text) {
  const parsed = JSON.parse(text)
  if (Array.isArray(parsed)) return parsed
  if (parsed?.users && Array.isArray(parsed.users)) return parsed.users
  throw new Error('Invalid JSON: expected { users: [...] } or [...]')
}

export function resetUsersToSeed() {
  writeUsers(seedUsersDefault())
}
