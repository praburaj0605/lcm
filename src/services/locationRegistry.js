import { nanoid } from 'nanoid'
import countriesData from '../data/locations/countries.json'
import statesByCountryData from '../data/locations/statesByCountry.json'
import citiesByCountryData from '../data/locations/citiesByCountry.json'
import airportsData from '../data/locations/airports.json'
import seaPortsData from '../data/locations/seaPorts.json'

const STORAGE_KEY = 'logistics-crm-location-overrides-v1'

function defaultOverrides() {
  return {
    countries: [],
    states: {},
    cities: {},
    airports: [],
    seaPorts: [],
  }
}

export function loadOverrides() {
  if (typeof localStorage === 'undefined') return defaultOverrides()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultOverrides()
    const parsed = JSON.parse(raw)
    return {
      ...defaultOverrides(),
      ...parsed,
      countries: Array.isArray(parsed.countries) ? parsed.countries : [],
      states: parsed.states && typeof parsed.states === 'object' ? parsed.states : {},
      cities: parsed.cities && typeof parsed.cities === 'object' ? parsed.cities : {},
      airports: Array.isArray(parsed.airports) ? parsed.airports : [],
      seaPorts: Array.isArray(parsed.seaPorts) ? parsed.seaPorts : [],
    }
  } catch {
    return defaultOverrides()
  }
}

export function saveOverrides(overrides) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    /* quota */
  }
}

export function getMergedCountries() {
  const o = loadOverrides()
  const byCode = new Map()
  for (const c of countriesData) byCode.set(c.code, c)
  for (const c of o.countries) byCode.set(c.code, c)
  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getMergedStatesForCountry(countryCode) {
  if (!countryCode) return []
  const o = loadOverrides()
  const base = statesByCountryData[countryCode] || []
  const extra = o.states[countryCode] || []
  const byName = new Map()
  for (const s of base) byName.set(s.name.toLowerCase(), s)
  for (const s of extra) byName.set(s.name.toLowerCase(), s)
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function getMergedCitiesForCountry(countryCode) {
  if (!countryCode) return []
  const o = loadOverrides()
  const base = citiesByCountryData[countryCode] || []
  const extra = o.cities[countryCode] || []
  const set = new Set([...base, ...extra].map((x) => String(x).trim()).filter(Boolean))
  return [...set].sort((a, b) => a.localeCompare(b))
}

export function getMergedAirports(filterCountryCode) {
  const o = loadOverrides()
  const merged = [...airportsData, ...o.airports]
  if (!filterCountryCode) return merged.sort((a, b) => a.iata.localeCompare(b.iata))
  return merged.filter((a) => a.countryCode === filterCountryCode).sort((a, b) => a.iata.localeCompare(b.iata))
}

export function getMergedSeaPorts(filterCountryCode) {
  const o = loadOverrides()
  const merged = [...seaPortsData, ...o.seaPorts]
  if (!filterCountryCode) return merged.sort((a, b) => a.code.localeCompare(b.code))
  return merged.filter((p) => p.countryCode === filterCountryCode).sort((a, b) => a.code.localeCompare(b.code))
}

/** For enquiry: suggest IATA + UNLOCODE labels filtered by country and mode. */
export function getAirportSelectOptions(countryCode) {
  return getMergedAirports(countryCode).map((a) => ({
    value: a.iata,
    label: `${a.iata} — ${a.name} (${a.city})`,
    kind: 'air',
  }))
}

export function getPortCodeOptions(countryCode, mode) {
  const sea = getMergedSeaPorts(countryCode)
  const air = getMergedAirports(countryCode)
  const out = []
  if (mode === 'sea' || mode === 'multimodal' || mode === 'road') {
    for (const p of sea) {
      out.push({
        value: p.code,
        label: `${p.code} — ${p.name} (${p.city})`,
        kind: 'sea',
      })
    }
  }
  if (mode === 'air' || mode === 'multimodal') {
    for (const a of air) {
      out.push({
        value: a.iata,
        label: `${a.iata} — ${a.name} (${a.city})`,
        kind: 'air',
      })
    }
  }
  if (mode === 'road' && !out.length) {
    for (const p of getMergedSeaPorts(countryCode)) {
      out.push({ value: p.code, label: `${p.code} — ${p.name}`, kind: 'sea' })
    }
  }
  return out
}

export function resolveCountryCode(raw) {
  if (!raw) return ''
  const s = String(raw).trim()
  if (/^[A-Z]{2}$/i.test(s)) {
    const u = s.toUpperCase()
    if (getMergedCountries().some((c) => c.code === u)) return u
  }
  const countries = getMergedCountries()
  const found = countries.find((c) => c.name.toLowerCase() === s.toLowerCase())
  if (found) return found.code
  return s
}

export function countryNameFromCode(code) {
  if (!code) return ''
  const countries = getMergedCountries()
  const u = String(code).trim().toUpperCase()
  const found = countries.find((c) => c.code === u)
  return found ? found.name : code
}

export function addCustomCountry(name) {
  const n = String(name || '').trim()
  if (!n) return null
  const o = loadOverrides()
  if (o.countries.some((c) => c.name.toLowerCase() === n.toLowerCase())) return null
  const code = `C${nanoid(5).toUpperCase()}`
  o.countries.push({ code, name: n })
  saveOverrides(o)
  return { code, name: n }
}

export function addCustomState(countryCode, stateName) {
  const n = String(stateName || '').trim()
  const cc = String(countryCode || '').trim()
  if (!n || !cc) return null
  const o = loadOverrides()
  if (!o.states[cc]) o.states[cc] = []
  if (o.states[cc].some((s) => s.name.toLowerCase() === n.toLowerCase())) return null
  const code = `S${nanoid(4).toUpperCase()}`
  o.states[cc].push({ code, name: n })
  saveOverrides(o)
  return { code, name: n }
}

export function addCustomCity(countryCode, cityName) {
  const n = String(cityName || '').trim()
  const cc = String(countryCode || '').trim()
  if (!n || !cc) return null
  const o = loadOverrides()
  if (!o.cities[cc]) o.cities[cc] = []
  if (o.cities[cc].some((c) => c.toLowerCase() === n.toLowerCase())) return null
  o.cities[cc].push(n)
  saveOverrides(o)
  return n
}

export function addCustomAirport(iata, name, city, countryCode) {
  const i = String(iata || '').trim().toUpperCase().slice(0, 3)
  const n = String(name || '').trim()
  const c = String(city || '').trim()
  const cc = String(countryCode || '').trim().toUpperCase()
  if (!i || i.length !== 3 || !n || !cc) return null
  const o = loadOverrides()
  const merged = [...airportsData, ...o.airports]
  const existing = merged.find((a) => a.iata === i)
  if (existing) {
    return {
      iata: existing.iata,
      name: existing.name,
      city: existing.city,
      countryCode: existing.countryCode,
      alreadyExists: true,
    }
  }
  o.airports.push({ iata: i, name: n, city: c || '—', countryCode: cc })
  saveOverrides(o)
  return { iata: i, name: n, city: c, countryCode: cc, alreadyExists: false }
}

export function addCustomSeaPort(code, name, city, countryCode) {
  const codeU = String(code || '').trim().toUpperCase()
  const n = String(name || '').trim()
  const c = String(city || '').trim()
  const cc = String(countryCode || '').trim().toUpperCase()
  if (!codeU || !n || !cc) return null
  const o = loadOverrides()
  if ([...seaPortsData, ...o.seaPorts].some((p) => p.code === codeU)) return null
  o.seaPorts.push({ code: codeU, name: n, city: c || '—', countryCode: cc })
  saveOverrides(o)
  return { code: codeU, name: n, city: c, countryCode: cc }
}
