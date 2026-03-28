/**
 * Mapbox implementation of GeolocationProvider.
 *
 * Uses the Mapbox Geocoding API v6 for geocoding, reverse geocoding, and
 * autocomplete suggestions. Distance calculations use the Haversine formula locally.
 * Mapbox does not provide a timezone API, so `getTimezone` is not implemented.
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

import type { MapboxGeolocationConfig } from './types.js'

/** Earth radius in kilometers. */
const EARTH_RADIUS_KM = 6371

/** Kilometers to miles conversion factor. */
const KM_TO_MI = 0.621371

/**
 * Makes an HTTP request and parses JSON.
 *
 * @param url - The fully constructed URL.
 * @param timeout - Request timeout in milliseconds.
 * @returns The parsed JSON response.
 * @throws {Error} If the request fails or returns a non-OK status.
 */
const fetchJson = async (url: string, timeout: number): Promise<Record<string, unknown>> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Mapbox API request failed with status ${String(response.status)}`)
    }
    return (await response.json()) as Record<string, unknown>
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Mapbox Geocoding API v6 feature shape.
 */
interface MapboxFeature {
  /** Feature ID. */
  id: string
  /** Feature type. */
  type: string
  /** Properties of the feature. */
  properties: {
    /** Mapbox ID. */
    mapbox_id: string
    /** Feature type (e.g., `'address'`, `'place'`, `'region'`). */
    feature_type: string
    /** Full formatted address. */
    full_address?: string
    /** Place name. */
    name: string
    /** Place-formatted name with context. */
    place_formatted?: string
    /** Context containing structured address components. */
    context?: {
      /** Street context. */
      street?: { name?: string }
      /** Neighborhood context. */
      neighborhood?: { name?: string }
      /** Postcode context. */
      postcode?: { name?: string }
      /** Place/city context. */
      place?: { name?: string }
      /** District/county context. */
      district?: { name?: string }
      /** Region/state context. */
      region?: {
        name?: string
        region_code?: string
        region_code_full?: string
      }
      /** Country context. */
      country?: {
        name?: string
        country_code?: string
        country_code_alpha_3?: string
      }
      /** Address context. */
      address?: {
        street_number?: string
        address_number?: string
        name?: string
      }
    }
    /** Coordinates of the feature. */
    coordinates?: {
      longitude: number
      latitude: number
    }
  }
  /** GeoJSON geometry. */
  geometry: {
    /** Geometry type (e.g., `'Point'`). */
    type: string
    /** Coordinates `[longitude, latitude]`. */
    coordinates: [number, number]
  }
  /** Bounding box `[west, south, east, north]`. */
  bbox?: [number, number, number, number]
}

/**
 * Mapbox Suggest API v1 suggestion shape.
 */
interface MapboxSuggestion {
  /** Suggestion name. */
  name: string
  /** Mapbox ID for retrieval. */
  mapbox_id: string
  /** Feature type. */
  feature_type: string
  /** Address for the suggestion. */
  address?: string
  /** Full address. */
  full_address?: string
  /** Place-formatted name with context. */
  place_formatted?: string
  /** Context containing address components. */
  context?: {
    /** Country context. */
    country?: { name?: string; country_code?: string }
    /** Region context. */
    region?: { name?: string; region_code?: string }
    /** Postcode context. */
    postcode?: { name?: string }
    /** Place context. */
    place?: { name?: string }
    /** Neighborhood context. */
    neighborhood?: { name?: string }
    /** Street context. */
    street?: { name?: string }
  }
}

/**
 * Maps a Mapbox feature to the normalized AddressComponents interface.
 *
 * @param feature - A Mapbox geocoding feature.
 * @returns Normalized address components.
 */
const mapComponents = (feature: MapboxFeature): AddressComponents => {
  const ctx = feature.properties.context
  return {
    streetNumber: ctx?.address?.address_number ?? ctx?.address?.street_number,
    street: ctx?.street?.name ?? ctx?.address?.name,
    city: ctx?.place?.name,
    state: ctx?.region?.name,
    stateCode: ctx?.region?.region_code,
    country: ctx?.country?.name,
    countryCode: ctx?.country?.country_code?.toUpperCase(),
    postalCode: ctx?.postcode?.name,
    county: ctx?.district?.name,
    neighborhood: ctx?.neighborhood?.name,
  }
}

/**
 * Maps a Mapbox feature to the normalized GeoResult interface.
 *
 * @param feature - A Mapbox geocoding feature.
 * @returns A normalized GeoResult.
 */
const mapGeoResult = (feature: MapboxFeature): GeoResult => {
  const [lng, lat] = feature.geometry.coordinates
  const result: GeoResult = {
    lat,
    lng,
    formattedAddress:
      feature.properties.full_address ??
      feature.properties.place_formatted ??
      feature.properties.name,
    components: mapComponents(feature),
    placeId: feature.properties.mapbox_id,
  }

  if (feature.bbox) {
    result.bounds = {
      northeast: { lat: feature.bbox[3], lng: feature.bbox[2] },
      southwest: { lat: feature.bbox[1], lng: feature.bbox[0] },
    }
  }

  return result
}

/**
 * Converts degrees to radians.
 *
 * @param deg - Angle in degrees.
 * @returns Angle in radians.
 */
const toRadians = (deg: number): number => (deg * Math.PI) / 180

/**
 * Creates a Mapbox geolocation provider.
 *
 * @param config - Provider configuration including the Mapbox access token.
 * @returns A `GeolocationProvider` backed by Mapbox APIs.
 */
export const createProvider = (config: MapboxGeolocationConfig): GeolocationProvider => {
  const baseUrl = config.baseUrl ?? 'https://api.mapbox.com'
  const timeout = config.timeout ?? 10_000
  const accessToken = config.accessToken

  return {
    async geocode(address: string): Promise<GeoResult[]> {
      const params = new URLSearchParams({
        q: address,
        access_token: accessToken,
      })

      if (config.language) {
        params.set('language', config.language)
      }
      if (config.country) {
        params.set('country', config.country)
      }

      const url = `${baseUrl}/search/geocode/v6/forward?${params.toString()}`
      const data = await fetchJson(url, timeout)
      const features = (data['features'] as MapboxFeature[] | undefined) ?? []
      return features.map(mapGeoResult)
    },

    async reverseGeocode(lat: number, lng: number): Promise<GeoResult[]> {
      const params = new URLSearchParams({
        longitude: String(lng),
        latitude: String(lat),
        access_token: accessToken,
      })

      if (config.language) {
        params.set('language', config.language)
      }

      const url = `${baseUrl}/search/geocode/v6/reverse?${params.toString()}`
      const data = await fetchJson(url, timeout)
      const features = (data['features'] as MapboxFeature[] | undefined) ?? []
      return features.map(mapGeoResult)
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
      const params = new URLSearchParams({
        q: query,
        access_token: accessToken,
      })

      if (options?.language ?? config.language) {
        params.set('language', (options?.language ?? config.language)!)
      }
      if (options?.countries?.length) {
        params.set('country', options.countries.join(','))
      } else if (config.country) {
        params.set('country', config.country)
      }
      if (options?.location) {
        params.set('proximity', `${String(options.location.lng)},${String(options.location.lat)}`)
      }
      if (options?.limit !== undefined) {
        params.set('limit', String(Math.min(options.limit, 10)))
      }
      if (options?.sessionToken) {
        params.set('session_token', options.sessionToken)
      }

      const url = `${baseUrl}/search/searchbox/v1/suggest?${params.toString()}`
      const data = await fetchJson(url, timeout)
      const suggestions = (data['suggestions'] as MapboxSuggestion[] | undefined) ?? []

      return suggestions.map((s) => ({
        placeId: s.mapbox_id,
        mainText: s.name,
        secondaryText: s.place_formatted ?? s.full_address ?? '',
        description: s.full_address ?? s.place_formatted ?? s.name,
      }))
    },
  }
}

/** Default provider instance, lazily initialized. Requires `MAPBOX_ACCESS_TOKEN` env var. */
let _provider: GeolocationProvider | null = null

/**
 * The provider implementation, lazily initialized with access token from `MAPBOX_ACCESS_TOKEN` environment variable.
 */
export const provider: GeolocationProvider = new Proxy({} as GeolocationProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      const accessToken = process.env['MAPBOX_ACCESS_TOKEN']
      if (!accessToken) {
        throw new Error(
          'MAPBOX_ACCESS_TOKEN environment variable is required for the Mapbox geolocation provider.',
        )
      }
      _provider = createProvider({ accessToken })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
