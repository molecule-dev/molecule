/**
 * Nominatim (OpenStreetMap) implementation of GeolocationProvider.
 *
 * Uses the Nominatim API for geocoding, reverse geocoding, and place search
 * (autocomplete). Distance calculations use the Haversine formula locally.
 * Nominatim does not provide a timezone API, so `getTimezone` is not implemented.
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

import type { NominatimGeolocationConfig } from './types.js'

/** Earth radius in kilometers. */
const EARTH_RADIUS_KM = 6371

/** Kilometers to miles conversion factor. */
const KM_TO_MI = 0.621371

/** Default Nominatim public instance URL. */
const DEFAULT_BASE_URL = 'https://nominatim.openstreetmap.org'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default maximum number of results. */
const DEFAULT_LIMIT = 10

/**
 * Nominatim search/reverse response item shape (jsonv2 format).
 */
interface NominatimResult {
  /** Internal Nominatim place identifier. */
  place_id: number
  /** OSM type (node, way, relation). */
  osm_type: string
  /** OSM identifier. */
  osm_id: number
  /** Latitude as a string. */
  lat: string
  /** Longitude as a string. */
  lon: string
  /** Full display name. */
  display_name: string
  /** Structured address breakdown. */
  address?: NominatimAddress
  /** Bounding box `[south, north, west, east]` as strings. */
  boundingbox?: [string, string, string, string]
  /** Place name. */
  name?: string
  /** Importance score. */
  importance?: number
}

/**
 * Nominatim address breakdown shape.
 */
interface NominatimAddress {
  /** House number. */
  house_number?: string
  /** Road/street name. */
  road?: string
  /** Suburb name. */
  suburb?: string
  /** Neighbourhood name. */
  neighbourhood?: string
  /** City name. */
  city?: string
  /** Town name (fallback for city). */
  town?: string
  /** Village name (fallback for city). */
  village?: string
  /** Municipality name (fallback for city). */
  municipality?: string
  /** County name. */
  county?: string
  /** State name. */
  state?: string
  /** ISO 3166-2 subdivision code (e.g., `'US-CA'`). */
  'ISO3166-2-lvl4'?: string
  /** Country name. */
  country?: string
  /** ISO 3166-1 alpha-2 country code. */
  country_code?: string
  /** Postal code. */
  postcode?: string
}

/**
 * Makes an HTTP request to the Nominatim API and parses JSON.
 *
 * @param url - The fully constructed URL.
 * @param userAgent - The User-Agent header value.
 * @param timeout - Request timeout in milliseconds.
 * @returns The parsed JSON response.
 * @throws {Error} If the request fails or returns a non-OK status.
 */
const fetchJson = async <T>(url: string, userAgent: string, timeout: number): Promise<T> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`Nominatim API request failed with status ${String(response.status)}`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Maps a Nominatim address breakdown to the normalized AddressComponents interface.
 *
 * @param address - A Nominatim address object.
 * @returns Normalized address components.
 */
const mapComponents = (address?: NominatimAddress): AddressComponents => {
  if (!address) {
    return {}
  }

  const stateCode = address['ISO3166-2-lvl4']?.split('-')[1]

  return {
    streetNumber: address.house_number,
    street: address.road,
    city: address.city ?? address.town ?? address.village ?? address.municipality,
    state: address.state,
    stateCode,
    country: address.country,
    countryCode: address.country_code?.toUpperCase(),
    postalCode: address.postcode,
    county: address.county,
    neighborhood: address.neighbourhood ?? address.suburb,
  }
}

/**
 * Maps a Nominatim result to the normalized GeoResult interface.
 *
 * @param result - A Nominatim search or reverse result.
 * @returns A normalized GeoResult.
 */
const mapGeoResult = (result: NominatimResult): GeoResult => {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)

  const geoResult: GeoResult = {
    lat,
    lng,
    formattedAddress: result.display_name,
    components: mapComponents(result.address),
    placeId: String(result.place_id),
  }

  if (result.boundingbox) {
    const [south, north, west, east] = result.boundingbox
    geoResult.bounds = {
      northeast: { lat: parseFloat(north), lng: parseFloat(east) },
      southwest: { lat: parseFloat(south), lng: parseFloat(west) },
    }
  }

  return geoResult
}

/**
 * Converts degrees to radians.
 *
 * @param deg - Angle in degrees.
 * @returns Angle in radians.
 */
const toRadians = (deg: number): number => (deg * Math.PI) / 180

/**
 * Builds common query parameters shared by geocode and reverse endpoints.
 *
 * @param config - Provider configuration.
 * @returns URLSearchParams with common parameters.
 */
const buildCommonParams = (config: NominatimGeolocationConfig): URLSearchParams => {
  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
  })

  if (config.language) {
    params.set('accept-language', config.language)
  }
  if (config.email) {
    params.set('email', config.email)
  }

  return params
}

/**
 * Creates a Nominatim geolocation provider.
 *
 * @param config - Provider configuration including the User-Agent string.
 * @returns A `GeolocationProvider` backed by the Nominatim API.
 */
export const createProvider = (config: NominatimGeolocationConfig): GeolocationProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const userAgent = config.userAgent
  const limit = config.limit ?? DEFAULT_LIMIT

  return {
    async geocode(address: string): Promise<GeoResult[]> {
      const params = buildCommonParams(config)
      params.set('q', address)
      params.set('limit', String(limit))

      if (config.countryCodes?.length) {
        params.set('countrycodes', config.countryCodes.join(',').toLowerCase())
      }

      const url = `${baseUrl}/search?${params.toString()}`
      const data = await fetchJson<NominatimResult[]>(url, userAgent, timeout)
      return data.map(mapGeoResult)
    },

    async reverseGeocode(lat: number, lng: number): Promise<GeoResult[]> {
      const params = buildCommonParams(config)
      params.set('lat', String(lat))
      params.set('lon', String(lng))

      const url = `${baseUrl}/reverse?${params.toString()}`
      const data = await fetchJson<NominatimResult | { error?: string }>(url, userAgent, timeout)

      if ('error' in data) {
        return []
      }

      return [mapGeoResult(data as NominatimResult)]
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
      const params = buildCommonParams(config)
      params.set('q', query)
      params.set('limit', String(options?.limit ?? Math.min(limit, 10)))

      if (options?.language) {
        params.set('accept-language', options.language)
      }
      if (options?.countries?.length) {
        params.set('countrycodes', options.countries.join(',').toLowerCase())
      } else if (config.countryCodes?.length) {
        params.set('countrycodes', config.countryCodes.join(',').toLowerCase())
      }
      if (options?.location) {
        params.set('viewbox', buildViewbox(options.location, options.radius ?? 50_000))
        params.set('bounded', '0')
      }

      const url = `${baseUrl}/search?${params.toString()}`
      const data = await fetchJson<NominatimResult[]>(url, userAgent, timeout)

      return data.map((result) => {
        const components = mapComponents(result.address)
        const mainText = result.name ?? components.street ?? result.display_name.split(',')[0]
        const secondaryParts = [
          components.city,
          components.state ?? components.stateCode,
          components.country,
        ].filter(Boolean)

        return {
          placeId: String(result.place_id),
          mainText,
          secondaryText: secondaryParts.join(', '),
          description: result.display_name,
          location: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          },
        }
      })
    },
  }
}

/**
 * Builds a viewbox parameter string from a center point and radius.
 *
 * @param center - The center coordinate.
 * @param radiusMeters - The radius in meters.
 * @returns A viewbox string in the format `west,south,east,north`.
 */
const buildViewbox = (center: LatLng, radiusMeters: number): string => {
  const latDelta = radiusMeters / 111_320
  const lngDelta = radiusMeters / (111_320 * Math.cos(toRadians(center.lat)))
  const west = center.lng - lngDelta
  const east = center.lng + lngDelta
  const south = center.lat - latDelta
  const north = center.lat + latDelta
  return `${String(west)},${String(south)},${String(east)},${String(north)}`
}

/** Default provider instance, lazily initialized. */
let _provider: GeolocationProvider | null = null

/**
 * The provider implementation, lazily initialized with User-Agent from
 * `NOMINATIM_USER_AGENT` environment variable (defaults to `'molecule-app'`).
 */
export const provider: GeolocationProvider = new Proxy({} as GeolocationProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      const userAgent = process.env['NOMINATIM_USER_AGENT'] ?? 'molecule-app'
      _provider = createProvider({
        userAgent,
        baseUrl: process.env['NOMINATIM_BASE_URL'],
        email: process.env['NOMINATIM_EMAIL'],
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
