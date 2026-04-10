import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || ''

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

let getAuthToken = () => null
let onAuthUnauthorized = () => {}

/** Call once from `main.jsx` to avoid circular imports with the store. */
export function bindApiAuth({ getToken, onUnauthorized }) {
  getAuthToken = getToken
  onAuthUnauthorized = onUnauthorized
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && getAuthToken()) {
      onAuthUnauthorized()
    }
    return Promise.reject(err)
  },
)

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || ''
}
