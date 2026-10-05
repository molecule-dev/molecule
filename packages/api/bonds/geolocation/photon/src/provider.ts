/**
 * Photon (OpenStreetMap) implementation of GeolocationProvider.
 *
 * Uses a Photon instance's `/api` (forward + search-as-you-type) and
 * `/reverse` endpoints. Distance calculations use the Haversine formula
 * locally. Photon does not provide a timezone API, so `getTimezone` is not
 * implemented.
 *
 * @module
 */

import type {
  AddressComponents,
  AutocompleteOptions,
  DistanceUnit,
  GeolocationProvider,
  GeoResult,
  LatLng,
  PlaceSuggestion,
} from '@molecule/api-geolocation'

import type { PhotonGeolocationConfig } from './types.js'

/** Earth radius in kilometers. */
const EARTH_RADIUS_KM = 6371

/** Kilometers to miles conversion factor. */
const KM_TO_MI = 0.621371

/** Default Photon instance URL. */
const DEFAULT_BASE_URL = 'https://photon.komoot.io'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default maximum number of results. */
const DEFAULT_LIMIT = 10

/**
 * A GeoJSON feature from a Photon response. `properties` is flat; some
 * fields (city, state, …) arrive as a string on one instance and a one-element
 * array on another — every text field goes through {@link asText}.
 */
interface PhotonFeature {
  /** GeoJSON geometry: `{ coordinates: [lng, lat] }`. */
  geometry?: { coordinates?: [number, number] }
  /** Flat Photon properties. */
  properties?: Record<string, unknown>
}

/**
 * Photon's GeoJSON response shape (a FeatureCollection).
 */
interface PhotonResponse {
  features?: PhotonFeature[]
}

/**
 * Normalizes a Photon property that may be a string or an array of strings
 * (newer Photon versions return some fields as arrays when several values
 * exist) to its first text value.
 *
 * @param value - The raw property value.
 * @returns The first string value, or undefined.
 */
const asText = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value)) {
    const first = value.find((v): v is string => typeof v === 'string' && v.length > 0)
    if (first !== undefined) return first
  }
  return undefined
}

/**
 * Coerces a raw property to a finite number, or undefined.
 *
 * @param value - The raw property value.
 * @returns The number, or undefined when absent or non-finite.
 */
const asNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Maps flat Photon properties to the normalized AddressComponents interface.
 *
 * @param p - Photon properties (may be undefined).
 * @returns Normalized address components.
 */
const mapComponents = (p?: Record<string, unknown>): AddressComponents => {
  if (!p) return {}
  return {
    streetNumber: asText(p.housenumber),
    street: asText(p.street),
    city: asText(p.city),
    state: asText(p.state),
    country: asText(p.country),
    countryCode: asText(p.countrycode)?.toUpperCase(),
    postalCode: asText(p.postcode),
    county: asText(p.county),
    neighborhood: asText(p.district),
  }
}

/**
 * Composes a human-readable address line from flat Photon properties —
 * Photon returns structured fields only, no preformatted display name.
 *
 * @param p - Photon properties.
 * @returns A composed one-line address.
 */
const composeFormattedAddress = (p: Record<string, unknown>): string => {
  const streetLine = [asText(p.housenumber), asText(p.street)].filter(Boolean).join(' ')
  const name = asText(p.name)
  const parts = [
    ...(name && name !== streetLine ? [name] : []),
    ...(streetLine ? [streetLine] : []),
    asText(p.city),
    asText(p.state),
    asText(p.country),
  ].filter((part): part is string => Boolean(part))
  return parts.join(', ')
}

/**
 * Maps a Photon feature to the normalized GeoResult interface. Returns
 * undefined when the feature carries no usable coordinate.
 *
 * @param feature - A Photon GeoJSON feature.
 * @returns A normalized GeoResult, or undefined.
 */
const mapGeoResult = (feature: PhotonFeature): GeoResult | undefined => {
  const coordinates = feature.geometry?.coordinates
  const lat = coordinates ? asNumber(coordinates[1]) : undefined
  const lng = coordinates ? asNumber(coordinates[0]) : undefined
  if (lat === undefined || lng === undefined) return undefined

  const p = feature.properties ?? {}
  const geoResult: GeoResult = {
    lat,
    lng,
    formattedAddress: composeFormattedAddress(p),
    components: mapComponents(p),
  }

  const osmId = asNumber(p.osm_id)
  const osmType = asText(p.osm_type)
  if (osmId !== undefined && osmType) {
    geoResult.placeId = `photon:${osmType.toLowerCase()}${osmId}`
  }

  // Photon extent order: [minLon, maxLat, maxLon, minLat].
  const extent = Array.isArray(p.extent) ? p.extent.map((v) => asNumber(v)) : []
  if (extent.length === 4 && extent.every((v): v is number => v !== undefined)) {
    const [minLng, maxLat, maxLng, minLat] = extent
    geoResult.bounds = {
      northeast: { lat: maxLat, lng: maxLng },
      southwest: { lat: minLat, lng: minLng },
    }
  }

  return geoResult
}

/**
 * Keeps only results inside the configured/asked-for countries. Photon has no
 * server-side country parameter, so the restriction happens here.
 *
 * @param results - Mapped results.
 * @param countries - ISO 3166-1 alpha-2 codes to keep.
 * @returns The filtered results.
 */
const filterByCountry = (results: GeoResult[], countries?: string[]): GeoResult[] => {
  if (!countries?.length) return results
  const wanted = new Set(countries.map((c) => c.toLowerCase()))
  return results.filter((r) => {
    const code = r.components.countryCode
    return code !== undefined && wanted.has(code.toLowerCase())
  })
}

/**
 * Converts degrees to radians.
 *
 * @param deg - Angle in degrees.
 * @returns Angle in radians.
 */
const toRadians = (deg: number): number => (deg * Math.PI) / 180

/**
 * Makes an HTTP request to the Photon API and parses the FeatureCollection.
 *
 * @param url - The fully constructed URL.
 * @param timeout - Request timeout in milliseconds.
 * @returns The parsed response.
 * @throws {Error} If the request fails or returns a non-OK status.
 */
const fetchFeatures = async (url: string, timeout: number): Promise<PhotonResponse> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Photon API request failed with status ${String(response.status)}`)
    }
    return (await response.json()) as PhotonResponse
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Creates a Photon geolocation provider.
 *
 * @param config - Provider configuration (base URL, language, bounds).
 * @returns A `GeolocationProvider` backed by the Photon API.
 */
export const createProvider = (config: PhotonGeolocationConfig = {}): GeolocationProvider => {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const limit = Math.max(1, Math.min(config.limit ?? DEFAULT_LIMIT, 50))

  const langParams = (): URLSearchParams => {
    const params = new URLSearchParams()
    if (config.language) params.set('lang', config.language)
    return params
  }

  return {
    async geocode(address: string): Promise<GeoResult[]> {
      const params = langParams()
      params.set('q', address)
      params.set('limit', String(limit))
      const data = await fetchFeatures(`${baseUrl}/api?${params.toString()}`, timeout)
      const results = (data.features ?? [])
        .map(mapGeoResult)
        .filter((r): r is GeoResult => r !== undefined)
      return filterByCountry(results, config.countryCodes)
    },

    async reverseGeocode(lat: number, lng: number): Promise<GeoResult[]> {
      const params = langParams()
      params.set('lat', String(lat))
      params.set('lon', String(lng))
      params.set('limit', '1')
      const data = await fetchFeatures(`${baseUrl}/reverse?${params.toString()}`, timeout)
      return (data.features ?? []).map(mapGeoResult).filter((r): r is GeoResult => r !== undefined)
    },

    distance(from: LatLng, to: LatLng, unit?: DistanceUnit): number {
      const dLat = toRadians(to.lat - from.lat)
      const dLng = toRadians(to.lng - from.lng)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(from.lat)) *
          Math.cos(toRadians(to.lat)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const km = EARTH_RADIUS_KM * c
      return unit === 'mi' ? km * KM_TO_MI : km
    },

    async autocomplete(query: string, options?: AutocompleteOptions): Promise<PlaceSuggestion[]> {
      const params = langParams()
      params.set('q', query)
      params.set('limit', String(Math.min(options?.limit ?? limit, 50)))
      if (options?.language) params.set('lang', options.language)
      if (options?.location) {
        params.set('lat', String(options.location.lat))
        params.set('lon', String(options.location.lng))
        if (options.radius !== undefined && options.radius > 0) {
          // Photon biases with a zoom level: zoom z spans roughly
          // 40075016 / 2^z meters, so invert the radius into a zoom.
          const zoom = Math.round(Math.log2(40_075_016 / options.radius))
          params.set('zoom', String(Math.max(1, Math.min(zoom, 16))))
        }
      }
      const data = await fetchFeatures(`${baseUrl}/api?${params.toString()}`, timeout)
      const results = (data.features ?? [])
        .map(mapGeoResult)
        .filter((r): r is GeoResult => r !== undefined)
      const wanted = options?.countries ?? config.countryCodes
      return filterByCountry(results, wanted).map((r) => {
        const secondaryParts = [
          r.components.city,
          r.components.state ?? r.components.stateCode,
          r.components.country,
        ].filter(Boolean)
        return {
          placeId: r.placeId ?? `photon:${r.lat},${r.lng}`,
          mainText: r.components.street ?? r.formattedAddress.split(',')[0],
          secondaryText: secondaryParts.join(', '),
          description: r.formattedAddress,
          location: { lat: r.lat, lng: r.lng },
        }
      })
    },
  }
}

/** Default provider instance, lazily initialized. */
let _provider: GeolocationProvider | null = null

/**
 * The provider implementation, lazily initialized from env: `PHOTON_BASE_URL`
 * (self-hosted or alternate instance) and `PHOTON_LANG` (result language).
 */
export const provider: GeolocationProvider = new Proxy({} as GeolocationProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        baseUrl: process.env['PHOTON_BASE_URL'],
        language: process.env['PHOTON_LANG'],
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider({
        baseUrl: process.env['PHOTON_BASE_URL'],
        language: process.env['PHOTON_LANG'],
      })
    }
    return Reflect.set(_provider, prop, value)
  },
})
