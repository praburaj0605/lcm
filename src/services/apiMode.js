/** True when the app should use FastAPI for auth and CRM data (see .env VITE_API_BASE_URL). */
export function isApiMode() {
  const u = import.meta.env.VITE_API_BASE_URL
  return Boolean(u && String(u).trim())
}
