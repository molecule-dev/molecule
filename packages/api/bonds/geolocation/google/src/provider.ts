/**
 * Google Maps implementation of GeolocationProvider.
 *
 * Uses the Google Maps Geocoding, Places, and Timezone APIs for geocoding,
 * reverse geocoding, autocomplete, and timezone lookups. Distance calculations
 * use the Haversine formula locally.
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
  TimezoneInfo,
} from '@molecule/api-geolocation'

import type { GoogleGeolocationConfig } from './types.js'

/** Earth radius in kilometers. */
const EARTH_RADIUS_KM = 6371

/** Kilometers to miles conversion factor. */
const KM_TO_MI = 0.621371

/**
 * Builds a URL with query parameters for Google Maps API requests.
 *
 * @param baseUrl - The base URL of the API.
 * @param path - The API endpoint path.
 * @param params - Query parameters as key-value pairs.
 * @returns The fully constructed URL string.
 */
const buildUrl = (baseUrl: string, path: string, params: Record<string, string>): string => {
  const url = new URL(path, baseUrl)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value)
    }
  }
  return url.toString()
}

/**
 * Makes an HTTP request to a Google Maps API endpoint.
 *
 * @param url - The fully constructed URL.
 * @param timeout - Request timeout in milliseconds.
 * @returns The parsed JSON response.
 * @throws {Error} If the request fails or the API returns an error status.
 */
const fetchJson = async (url: string, timeout: number): Promise<Record<string, unknown>> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Google Maps API request failed with status ${String(response.status)}`)
    }
    return (await response.json()) as Record<string, unknown>
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Extracts a specific address component from a Google geocoding result.
 *
 * @param components - The array of address components from the Google API.
 * @param type - The component type to extract (e.g., `'locality'`, `'country'`).
 * @param useShort - Whether to return the short_name instead of long_name.
 * @returns The component value, or `undefined` if not found.
 */
const extractComponent = (
  components: GoogleAddressComponent[],
  type: string,
  useShort = false,
): string | undefined => {
  const comp = components.find((c) => c.types.includes(type))
  return comp ? (useShort ? comp.short_name : comp.long_name) : undefined
}

/**
 * Google Maps address component shape from the Geocoding API.
 */
interface GoogleAddressComponent {
  /** Long name of the component. */
  long_name: string
  /** Short/abbreviated name of the component. */
  short_name: string
  /** Types describing this component. */
  types: string[]
}

/**
 * Google Maps geocoding result shape.
 */
interface GoogleGeocodingResult {
  /** Address components. */
  address_components: GoogleAddressComponent[]
  /** Formatted address string. */
  formatted_address: string
  /** Geometry containing location and bounds. */
  geometry: {
    /** The geocoded location. */
    location: { lat: number; lng: number }
    /** Bounding box of the result. */
    bounds?: {
      northeast: { lat: number; lng: number }
      southwest: { lat: number; lng: number }
    }
    /** Viewport bounding box. */
    viewport?: {
      northeast: { lat: number; lng: number }
      southwest: { lat: number; lng: number }
    }
  }
  /** Unique place identifier. */
  place_id: string
  /** Types associated with this result. */
  types: string[]
}

/**
 * Google Maps autocomplete prediction shape.
 */
interface GoogleAutocompletePrediction {
  /** Place identifier. */
  place_id: string
  /** Structured formatting of the description. */
  structured_formatting: {
    /** Primary text. */
    main_text: string
    /** Secondary text. */
    secondary_text: string
  }
  /** Full text description. */
  description: string
}

/**
 * Maps Google address components to the normalized AddressComponents interface.
 *
 * @param components - The array of Google address components.
 * @returns Normalized address components.
 */
const mapComponents = (components: GoogleAddressComponent[]): AddressComponents => ({
  streetNumber: extractComponent(components, 'street_number'),
  street: extractComponent(components, 'route'),
  city:
    extractComponent(components, 'locality') ?? extractComponent(components, 'sublocality_level_1'),
  state: extractComponent(components, 'administrative_area_level_1'),
  stateCode: extractComponent(components, 'administrative_area_level_1', true),
  country: extractComponent(components, 'country'),
  countryCode: extractComponent(components, 'country', true),
  postalCode: extractComponent(components, 'postal_code'),
  county: extractComponent(components, 'administrative_area_level_2'),
  neighborhood: extractComponent(components, 'neighborhood'),
})

/**
 * Maps a Google geocoding result to the normalized GeoResult interface.
 *
 * @param result - A Google geocoding API result.
 * @returns A normalized GeoResult.
 */
const mapGeoResult = (result: GoogleGeocodingResult): GeoResult => {
  const bounds = result.geometry.bounds ?? result.geometry.viewport
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
    components: mapComponents(result.address_components),
    placeId: result.place_id,
    ...(bounds
      ? {
          bounds: {
            northeast: { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
            southwest: { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
          },
        }
      : {}),
  }
}

/**
 * Converts degrees to radians.
 *
 * @param deg - Angle in degrees.
 * @returns Angle in radians.
 */
const toRadians = (deg: number): number => (deg * Math.PI) / 180

/**
 * Creates a Google Maps geolocation provider.
 *
 * @param config - Provider configuration including the Google Maps API key.
 * @returns A `GeolocationProvider` backed by Google Maps APIs.
 */
export const createProvider = (config: GoogleGeolocationConfig): GeolocationProvider => {
  const baseUrl = config.baseUrl ?? 'https://maps.googleapis.com'
  const timeout = config.timeout ?? 10_000
  const apiKey = config.apiKey

  /**
   * Builds common query parameters shared across Google API requests.
   *
   * @returns Common query parameters.
   */
  const commonParams = (): Record<string, string> => {
    const params: Record<string, string> = { key: apiKey }
    if (config.language) params['language'] = config.language
    if (config.region) params['region'] = config.region
    return params
  }

  return {
    async geocode(address: string): Promise<GeoResult[]> {
      const url = buildUrl(baseUrl, '/maps/api/geocode/json', {
        ...commonParams(),
        address,
      })

      const data = await fetchJson(url, timeout)

      if (data['status'] !== 'OK' && data['status'] !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Geocoding API error: ${String(data['status'])} — ${String(data['error_message'] ?? 'Unknown error')}`,
        )
      }

      const results = (data['results'] ?? []) as GoogleGeocodingResult[]
      return results.map(mapGeoResult)
    },

    async reverseGeocode(lat: number, lng: number): Promise<GeoResult[]> {
      const url = buildUrl(baseUrl, '/maps/api/geocode/json', {
        ...commonParams(),
        latlng: `${String(lat)},${String(lng)}`,
      })

      const data = await fetchJson(url, timeout)

      if (data['status'] !== 'OK' && data['status'] !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Geocoding API error: ${String(data['status'])} — ${String(data['error_message'] ?? 'Unknown error')}`,
        )
      }

      const results = (data['results'] ?? []) as GoogleGeocodingResult[]
      return results.map(mapGeoResult)
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
      const params: Record<string, string> = {
        ...commonParams(),
        input: query,
      }

      if (options?.location) {
        params['location'] = `${String(options.location.lat)},${String(options.location.lng)}`
      }
      if (options?.radius !== undefined) {
        params['radius'] = String(options.radius)
      }
      if (options?.countries?.length) {
        params['components'] = options.countries.map((c) => `country:${c}`).join('|')
      }
      if (options?.language) {
        params['language'] = options.language
      }
      if (options?.sessionToken) {
        params['sessiontoken'] = options.sessionToken
      }

      const url = buildUrl(baseUrl, '/maps/api/place/autocomplete/json', params)
      const data = await fetchJson(url, timeout)

      if (data['status'] !== 'OK' && data['status'] !== 'ZERO_RESULTS') {
        throw new Error(
          `Google Places Autocomplete API error: ${String(data['status'])} — ${String(data['error_message'] ?? 'Unknown error')}`,
        )
      }

      const predictions = (data['predictions'] ?? []) as GoogleAutocompletePrediction[]
      const limited = options?.limit ? predictions.slice(0, options.limit) : predictions

      return limited.map((p) => ({
        placeId: p.place_id,
        mainText: p.structured_formatting.main_text,
        secondaryText: p.structured_formatting.secondary_text,
        description: p.description,
      }))
    },

    async getTimezone(lat: number, lng: number): Promise<TimezoneInfo> {
      const timestamp = Math.floor(Date.now() / 1000)
      const url = buildUrl(baseUrl, '/maps/api/timezone/json', {
        ...commonParams(),
        location: `${String(lat)},${String(lng)}`,
        timestamp: String(timestamp),
      })

      const data = await fetchJson(url, timeout)

      if (data['status'] !== 'OK') {
        throw new Error(
          `Google Timezone API error: ${String(data['status'])} — ${String(data['error_message'] ?? 'Unknown error')}`,
        )
      }

      return {
        timeZoneId: data['timeZoneId'] as string,
        timeZoneName: data['timeZoneName'] as string,
        rawOffset: data['rawOffset'] as number,
        dstOffset: data['dstOffset'] as number,
      }
    },
  }
}

/** Default provider instance, lazily initialized. Requires `GOOGLE_MAPS_API_KEY` env var. */
let _provider: GeolocationProvider | null = null

/**
 * The provider implementation, lazily initialized with API key from `GOOGLE_MAPS_API_KEY` environment variable.
 */
export const provider: GeolocationProvider = new Proxy({} as GeolocationProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      const apiKey = process.env['GOOGLE_MAPS_API_KEY']
      if (!apiKey) {
        throw new Error(
          'GOOGLE_MAPS_API_KEY environment variable is required for the Google geolocation provider.',
        )
      }
      _provider = createProvider({ apiKey })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
