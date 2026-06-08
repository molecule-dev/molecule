/**
 * Amadeus implementation of the {@link TravelProvider} aggregate
 * trip-planning interface.
 *
 * Exposes a single `searchTripOptions` call that fans out across
 * Amadeus's per-vertical Self-Service APIs in parallel:
 *
 * - Flights — `GET /v2/shopping/flight-offers` (when
 *   {@link SearchTripOptions.includeFlights} is `true`).
 * - Hotels — `GET /v1/reference-data/locations/hotels/by-city`
 *   followed by batched `GET /v3/shopping/hotel-offers` calls (when
 *   {@link SearchTripOptions.includeHotels} is `true`).
 * - Activities — `GET /v1/reference-data/locations/cities` to resolve
 *   the destination IATA code to a geographic point, then
 *   `GET /v1/shopping/activities?latitude=...&longitude=...` (when
 *   {@link SearchTripOptions.includeActivities} is `true`).
 * - Cars — Amadeus does not expose a public car-rental API as of
 *   v22, so {@link TravelProvider.searchCars} returns an empty array
 *   rather than throwing. {@link SearchTripOptions.includeCars} is
 *   accepted for API symmetry; the field is silently honored as
 *   "no cars available".
 *
 * The bond reuses the same `AMADEUS_CLIENT_ID` /
 * `AMADEUS_CLIENT_SECRET` env vars as `@molecule/api-flights-amadeus`
 * and `@molecule/api-hotels-amadeus`. Each provider instance maintains
 * its own OAuth2 token cache; tokens are minted on first use and
 * refreshed once the upstream-supplied `expires_in` window (less a
 * configurable skew) elapses.
 *
 * Credentials NEVER appear in error messages. URLs do not carry
 * authentication in the query string — the bearer token is sent via
 * the `Authorization` header.
 *
 * @module
 */

import type {
  ActivityOffer,
  CarOffer,
  FlightOffer,
  FlightSegment,
  FlightSegmentEndpoint,
  HotelOffer,
  IsoDuration,
  SearchActivitiesOptions,
  SearchCarsOptions,
  SearchTripOptions,
  TravelerCounts,
  TravelProvider,
  TripSearchResult,
} from '@molecule/api-travel'

import type { AmadeusTravelConfig } from './types.js'
import {
  AmadeusTravelMissingCredentialsError,
  AmadeusTravelTokenMintError,
  AmadeusTravelUpstreamError,
} from './types.js'

/** Default Self-Service test (sandbox) base URL. */
const DEFAULT_TEST_BASE_URL = 'https://test.api.amadeus.com'

/** Default production base URL. */
const DEFAULT_PRODUCTION_BASE_URL = 'https://api.amadeus.com'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 15_000

/** Default token-skew window in seconds. */
const DEFAULT_TOKEN_SKEW_SECONDS = 30

/**
 * Maximum number of hotelIds the provider batches into a single
 * `/v3/shopping/hotel-offers` call.
 */
const HOTEL_IDS_BATCH_SIZE = 20

/**
 * Maximum number of hotels to enrich with priced offers when no
 * explicit `maxResultsPerCategory` is supplied.
 */
const DEFAULT_MAX_HOTELS = 20

/** Resolve the effective base URL given the configuration. */
const resolveBaseUrl = (config: AmadeusTravelConfig): string => {
  if (config.baseUrl) return config.baseUrl
  return config.useProduction ? DEFAULT_PRODUCTION_BASE_URL : DEFAULT_TEST_BASE_URL
}

/** Successful Amadeus OAuth2 token response shape. */
interface AmadeusTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

/** Generic Amadeus error envelope shared across endpoints. */
interface AmadeusErrorEnvelope {
  errors?: Array<{
    code?: number
    title?: string
    detail?: string
    status?: number
  }>
}

/** Cached OAuth2 token slot for one provider instance. */
interface CachedToken {
  accessToken: string
  expiresAtMs: number
}

/**
 * Resolves the configured client credentials, throwing a sanitized
 * error (NEVER containing the secret) if either is missing.
 */
const requireCredentials = (
  config: AmadeusTravelConfig,
): { clientId: string; clientSecret: string } => {
  const clientId = config.clientId ?? process.env['AMADEUS_CLIENT_ID']
  const clientSecret = config.clientSecret ?? process.env['AMADEUS_CLIENT_SECRET']
  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new AmadeusTravelMissingCredentialsError()
  }
  if (typeof clientSecret !== 'string' || clientSecret.length === 0) {
    throw new AmadeusTravelMissingCredentialsError()
  }
  return { clientId, clientSecret }
}

/**
 * Mints a fresh OAuth2 token. The `client_secret` NEVER appears in
 * any thrown error.
 */
const mintToken = async (
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  timeout: number,
): Promise<AmadeusTokenResponse> => {
  const url = `${baseUrl}/v1/security/oauth2/token`
  const body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new AmadeusTravelTokenMintError(
        `Amadeus token mint failed with status ${String(response.status)}`,
        response.status,
      )
    }
    const parsed = (await response.json()) as AmadeusTokenResponse & AmadeusErrorEnvelope
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      const detail = parsed.errors[0]?.detail ?? parsed.errors[0]?.title ?? 'Token mint rejected'
      throw new AmadeusTravelTokenMintError(`Amadeus token mint failed: ${detail}`, null)
    }
    if (typeof parsed.access_token !== 'string' || parsed.access_token.length === 0) {
      throw new AmadeusTravelTokenMintError('Amadeus token mint returned no access_token', null)
    }
    return parsed
  } finally {
    clearTimeout(timer)
  }
}

/** Per-instance OAuth2 token cache. */
interface TokenCache {
  getToken(): Promise<string>
}

/** Builds a {@link TokenCache} closure for one provider instance. */
const createTokenCache = (
  baseUrl: string,
  config: AmadeusTravelConfig,
  timeout: number,
  skewSeconds: number,
): TokenCache => {
  let cache: CachedToken | null = null
  return {
    async getToken(): Promise<string> {
      const now = Date.now()
      if (cache && cache.expiresAtMs > now) {
        return cache.accessToken
      }
      const { clientId, clientSecret } = requireCredentials(config)
      const minted = await mintToken(baseUrl, clientId, clientSecret, timeout)
      cache = {
        accessToken: minted.access_token,
        expiresAtMs: now + (minted.expires_in - skewSeconds) * 1000,
      }
      return cache.accessToken
    },
  }
}

/**
 * Issues an authenticated GET against an Amadeus data endpoint and
 * parses the JSON response. Errors NEVER contain the OAuth secret.
 */
const fetchAmadeus = async <T extends AmadeusErrorEnvelope>(
  baseUrl: string,
  path: string,
  params: URLSearchParams,
  token: string,
  timeout: number,
): Promise<T> => {
  const query = params.toString()
  const url = query.length > 0 ? `${baseUrl}${path}?${query}` : `${baseUrl}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      let detail: string | undefined
      try {
        const body = (await response.json()) as AmadeusErrorEnvelope
        detail = body.errors?.[0]?.detail ?? body.errors?.[0]?.title
      } catch (_error) {
        // Ignore parse failures — the error-body JSON is best-effort detail
        // extraction; the upstream HTTP error is already captured above.
      }
      throw new AmadeusTravelUpstreamError(response.status, detail)
    }
    const parsed = (await response.json()) as T
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      const first = parsed.errors[0]
      const detail = first?.detail ?? first?.title ?? 'Unknown Amadeus error'
      throw new AmadeusTravelUpstreamError(first?.status ?? 502, detail)
    }
    return parsed
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------
// Flights
// ---------------------------------------------------------------------

interface AmadeusFlightSegment {
  departure: { iataCode: string; at: string; terminal?: string }
  arrival: { iataCode: string; at: string; terminal?: string }
  carrierCode: string
  number: string
  duration?: string
}

interface AmadeusItinerary {
  duration?: string
  segments: AmadeusFlightSegment[]
}

interface AmadeusFlightOfferRaw {
  id: string
  itineraries: AmadeusItinerary[]
  price: { total: string; currency: string; grandTotal?: string }
}

interface AmadeusFlightSearchResponse extends AmadeusErrorEnvelope {
  data?: AmadeusFlightOfferRaw[]
}

/** Sums itinerary durations into a single ISO 8601 duration string. */
const sumItineraryDurations = (itineraries: AmadeusItinerary[]): IsoDuration => {
  let totalMinutes = 0
  for (const it of itineraries) {
    if (!it.duration) continue
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/u.exec(it.duration)
    if (!match) continue
    const hours = match[1] ? parseInt(match[1], 10) : 0
    const minutes = match[2] ? parseInt(match[2], 10) : 0
    totalMinutes += hours * 60 + minutes
  }
  if (totalMinutes === 0) return 'PT0M'
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  if (hh === 0) return `PT${String(mm)}M`
  if (mm === 0) return `PT${String(hh)}H`
  return `PT${String(hh)}H${String(mm)}M`
}

/**
 * Maps a raw Amadeus flight segment to a normalized
 * {@link FlightSegment}.
 */
const mapFlightSegment = (raw: AmadeusFlightSegment): FlightSegment => {
  const departure: FlightSegmentEndpoint = {
    airport: raw.departure.iataCode,
    at: raw.departure.at,
    terminal: raw.departure.terminal ?? null,
  }
  const arrival: FlightSegmentEndpoint = {
    airport: raw.arrival.iataCode,
    at: raw.arrival.at,
    terminal: raw.arrival.terminal ?? null,
  }
  return {
    departure,
    arrival,
    carrier: raw.carrierCode,
    flightNumber: raw.number,
    duration: raw.duration ?? null,
  }
}

/**
 * Maps a raw Amadeus flight offer to a normalized
 * {@link FlightOffer}.
 */
const mapFlightOffer = (raw: AmadeusFlightOfferRaw): FlightOffer => {
  const segments: FlightSegment[] = []
  for (const itinerary of raw.itineraries) {
    for (const segment of itinerary.segments) {
      segments.push(mapFlightSegment(segment))
    }
  }
  const totalRaw = raw.price.grandTotal ?? raw.price.total
  return {
    id: raw.id,
    price: { total: Number(totalRaw), currency: raw.price.currency },
    segments,
    duration: sumItineraryDurations(raw.itineraries),
  }
}

/** Builds the `/v2/shopping/flight-offers` query parameters. */
const buildFlightSearchParams = (
  options: SearchTripOptions,
  travelers: Required<TravelerCounts>,
): URLSearchParams => {
  const params = new URLSearchParams()
  params.set('originLocationCode', options.origin)
  params.set('destinationLocationCode', options.destination)
  params.set('departureDate', options.departureDate)
  params.set('adults', String(travelers.adults))
  if (options.returnDate) params.set('returnDate', options.returnDate)
  if (travelers.children > 0) params.set('children', String(travelers.children))
  if (travelers.infants > 0) params.set('infants', String(travelers.infants))
  if (options.maxResultsPerCategory !== undefined && options.maxResultsPerCategory > 0) {
    params.set('max', String(options.maxResultsPerCategory))
  }
  return params
}

// ---------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------

interface AmadeusHotelLocationRow {
  hotelId?: string
  name?: string
  rating?: string | number
}

interface AmadeusHotelLocationResponse extends AmadeusErrorEnvelope {
  data?: AmadeusHotelLocationRow[]
}

interface AmadeusHotelOfferRow {
  id?: string
  checkInDate?: string
  checkOutDate?: string
  room?: { description?: { text?: string } }
  price?: { total?: string; currency?: string }
  policies?: { cancellations?: Array<{ numberOfNights?: number }> }
}

interface AmadeusHotelOffersHit {
  hotel?: { hotelId?: string; name?: string; rating?: string | number }
  offers?: AmadeusHotelOfferRow[]
}

interface AmadeusHotelOffersResponse extends AmadeusErrorEnvelope {
  data?: AmadeusHotelOffersHit[]
}

/** Splits an array into fixed-size chunks. */
const chunk = <T>(items: T[], size: number): T[][] => {
  if (size < 1) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/**
 * Parses an Amadeus rating field (string or number) into a plain
 * integer. Returns `undefined` for unparseable / missing values.
 */
const parseOptionalRating = (value: string | number | undefined): number | undefined => {
  if (value == null) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (value === '' || value === 'None') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * Maps a raw Amadeus hotel-offer row + hit envelope to a normalized
 * {@link HotelOffer}.
 */
const mapHotelOffer = (
  hit: AmadeusHotelOffersHit,
  raw: AmadeusHotelOfferRow,
): HotelOffer | undefined => {
  if (
    typeof raw.id !== 'string' ||
    raw.id.length === 0 ||
    typeof raw.checkInDate !== 'string' ||
    typeof raw.checkOutDate !== 'string' ||
    !raw.price ||
    typeof raw.price.total !== 'string' ||
    typeof raw.price.currency !== 'string'
  ) {
    return undefined
  }
  const total = Number(raw.price.total)
  if (!Number.isFinite(total)) return undefined
  const hotelId = hit.hotel?.hotelId
  const name = hit.hotel?.name
  if (typeof hotelId !== 'string' || hotelId.length === 0 || typeof name !== 'string') {
    return undefined
  }
  const offer: HotelOffer = {
    id: raw.id,
    hotelId,
    name,
    price: { total, currency: raw.price.currency },
    checkInDate: raw.checkInDate,
    checkOutDate: raw.checkOutDate,
  }
  const rating = parseOptionalRating(hit.hotel?.rating)
  if (rating !== undefined) offer.rating = rating
  const description = raw.room?.description?.text
  if (typeof description === 'string' && description.length > 0) {
    offer.roomDescription = description
  }
  if (Array.isArray(raw.policies?.cancellations)) {
    const policies = raw.policies.cancellations
    if (policies.length === 0) {
      offer.refundable = true
    } else if (policies.every((p) => (p?.numberOfNights ?? 0) === 0)) {
      offer.refundable = true
    } else if (policies.some((p) => (p?.numberOfNights ?? 0) > 0)) {
      offer.refundable = false
    }
  }
  return offer
}

// ---------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------

interface AmadeusCityRow {
  iataCode?: string
  geoCode?: { latitude?: number; longitude?: number }
}

interface AmadeusCitiesResponse extends AmadeusErrorEnvelope {
  data?: AmadeusCityRow[]
}

interface AmadeusActivityRow {
  id?: string
  name?: string
  shortDescription?: string
  description?: string
  geoCode?: { latitude?: number; longitude?: number }
  pictures?: string[]
  bookingLink?: string
  minimumDuration?: string
  price?: { amount?: string; currencyCode?: string }
}

interface AmadeusActivitiesResponse extends AmadeusErrorEnvelope {
  data?: AmadeusActivityRow[]
}

/**
 * Maps a raw Amadeus activity row to a normalized
 * {@link ActivityOffer}.
 */
const mapActivity = (raw: AmadeusActivityRow): ActivityOffer | undefined => {
  if (typeof raw.id !== 'string' || raw.id.length === 0) return undefined
  if (typeof raw.name !== 'string' || raw.name.length === 0) return undefined
  if (
    !raw.price ||
    typeof raw.price.amount !== 'string' ||
    typeof raw.price.currencyCode !== 'string'
  ) {
    return undefined
  }
  const total = Number(raw.price.amount)
  if (!Number.isFinite(total)) return undefined
  const out: ActivityOffer = {
    id: raw.id,
    name: raw.name,
    price: { total, currency: raw.price.currencyCode },
  }
  const description = raw.shortDescription ?? raw.description
  if (typeof description === 'string' && description.length > 0) {
    out.description = description
  }
  if (
    raw.geoCode &&
    typeof raw.geoCode.latitude === 'number' &&
    typeof raw.geoCode.longitude === 'number'
  ) {
    out.location = { lat: raw.geoCode.latitude, lon: raw.geoCode.longitude }
  }
  if (Array.isArray(raw.pictures) && raw.pictures.length > 0) {
    const first = raw.pictures[0]
    if (typeof first === 'string' && first.length > 0) {
      out.pictureUrl = first
    }
  }
  if (typeof raw.bookingLink === 'string' && raw.bookingLink.length > 0) {
    out.bookingUrl = raw.bookingLink
  }
  if (typeof raw.minimumDuration === 'string' && raw.minimumDuration.length > 0) {
    out.minimumDuration = raw.minimumDuration
  }
  return out
}

/**
 * Resolves an IATA city code to a geographic point via the Amadeus
 * cities reference-data endpoint. Returns `null` when the upstream
 * does not supply geo coordinates for the code.
 */
const resolveCityGeo = async (
  baseUrl: string,
  cityCode: string,
  token: string,
  timeout: number,
): Promise<{ lat: number; lon: number } | null> => {
  const params = new URLSearchParams()
  params.set('keyword', cityCode)
  params.set('max', '1')
  const body = await fetchAmadeus<AmadeusCitiesResponse>(
    baseUrl,
    '/v1/reference-data/locations/cities',
    params,
    token,
    timeout,
  )
  for (const row of body.data ?? []) {
    if (
      row.geoCode &&
      typeof row.geoCode.latitude === 'number' &&
      typeof row.geoCode.longitude === 'number'
    ) {
      return { lat: row.geoCode.latitude, lon: row.geoCode.longitude }
    }
  }
  return null
}

// ---------------------------------------------------------------------
// Provider factory
// ---------------------------------------------------------------------

/**
 * Creates an Amadeus travel trip-planning provider.
 *
 * @param config - Provider configuration. Credentials may be supplied
 *   here directly or via the `AMADEUS_CLIENT_ID` and
 *   `AMADEUS_CLIENT_SECRET` environment variables.
 * @returns A {@link TravelProvider} backed by Amadeus.
 */
export const createProvider = (config: AmadeusTravelConfig = {}): TravelProvider => {
  const baseUrl = resolveBaseUrl(config)
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const skewSeconds = config.tokenSkewSeconds ?? DEFAULT_TOKEN_SKEW_SECONDS
  const tokenCache = createTokenCache(baseUrl, config, timeout, skewSeconds)

  const resolveTravelers = (input?: TravelerCounts): Required<TravelerCounts> => ({
    adults: input?.adults ?? 1,
    children: input?.children ?? 0,
    infants: input?.infants ?? 0,
  })

  const fetchFlights = async (
    options: SearchTripOptions,
    travelers: Required<TravelerCounts>,
    token: string,
  ): Promise<FlightOffer[]> => {
    const params = buildFlightSearchParams(options, travelers)
    const body = await fetchAmadeus<AmadeusFlightSearchResponse>(
      baseUrl,
      '/v2/shopping/flight-offers',
      params,
      token,
      timeout,
    )
    return (body.data ?? []).map(mapFlightOffer)
  }

  const fetchHotels = async (
    options: SearchTripOptions,
    travelers: Required<TravelerCounts>,
    token: string,
  ): Promise<HotelOffer[]> => {
    if (!options.returnDate) {
      // Hotels need a check-out date. Without one we cannot price.
      return []
    }
    const adults = travelers.adults
    const maxHotels =
      options.maxResultsPerCategory !== undefined && options.maxResultsPerCategory > 0
        ? options.maxResultsPerCategory
        : DEFAULT_MAX_HOTELS

    // Step 1: list hotels in the destination city.
    const locationsParams = new URLSearchParams()
    locationsParams.set('cityCode', options.destination)
    const locations = await fetchAmadeus<AmadeusHotelLocationResponse>(
      baseUrl,
      '/v1/reference-data/locations/hotels/by-city',
      locationsParams,
      token,
      timeout,
    )
    const hotelIds: string[] = []
    for (const row of locations.data ?? []) {
      if (typeof row.hotelId === 'string' && row.hotelId.length > 0) {
        hotelIds.push(row.hotelId)
      }
      if (hotelIds.length >= maxHotels) break
    }
    if (hotelIds.length === 0) return []

    // Step 2: batched priced offers.
    const out: HotelOffer[] = []
    for (const batch of chunk(hotelIds, HOTEL_IDS_BATCH_SIZE)) {
      const params = new URLSearchParams()
      params.set('hotelIds', batch.join(','))
      params.set('checkInDate', options.departureDate)
      params.set('checkOutDate', options.returnDate)
      params.set('adults', String(adults))
      try {
        const body = await fetchAmadeus<AmadeusHotelOffersResponse>(
          baseUrl,
          '/v3/shopping/hotel-offers',
          params,
          token,
          timeout,
        )
        for (const hit of body.data ?? []) {
          for (const raw of hit.offers ?? []) {
            const mapped = mapHotelOffer(hit, raw)
            if (mapped) out.push(mapped)
          }
        }
      } catch (_error) {
        // Swallow per-batch enrichment failures — partial hotel
        // results are more useful than failing the whole trip search.
      }
      if (out.length >= maxHotels) break
    }
    return out.slice(0, maxHotels)
  }

  const fetchActivitiesAtPoint = async (
    lat: number,
    lon: number,
    maxResults: number | undefined,
    token: string,
  ): Promise<ActivityOffer[]> => {
    const params = new URLSearchParams()
    params.set('latitude', String(lat))
    params.set('longitude', String(lon))
    const body = await fetchAmadeus<AmadeusActivitiesResponse>(
      baseUrl,
      '/v1/shopping/activities',
      params,
      token,
      timeout,
    )
    const mapped: ActivityOffer[] = []
    for (const row of body.data ?? []) {
      const offer = mapActivity(row)
      if (offer) mapped.push(offer)
      if (maxResults !== undefined && maxResults > 0 && mapped.length >= maxResults) break
    }
    return mapped
  }

  const fetchActivitiesForDestination = async (
    destination: string,
    maxResults: number | undefined,
    token: string,
  ): Promise<ActivityOffer[]> => {
    const geo = await resolveCityGeo(baseUrl, destination, token, timeout)
    if (!geo) return []
    return fetchActivitiesAtPoint(geo.lat, geo.lon, maxResults, token)
  }

  return {
    async searchTripOptions(options: SearchTripOptions): Promise<TripSearchResult> {
      const travelers = resolveTravelers(options.travelers)
      const includeFlights = options.includeFlights ?? true
      const includeHotels = options.includeHotels ?? true
      const includeActivities = options.includeActivities ?? false
      // includeCars is accepted for API symmetry but Amadeus has no
      // public cars API as of v22 — see searchCars JSDoc below.

      const token = await tokenCache.getToken()

      const tasks: Array<Promise<unknown>> = []
      let flights: FlightOffer[] = []
      let hotels: HotelOffer[] = []
      let activities: ActivityOffer[] = []

      if (includeFlights) {
        tasks.push(
          fetchFlights(options, travelers, token).then((r) => {
            flights = r
          }),
        )
      }
      if (includeHotels) {
        tasks.push(
          fetchHotels(options, travelers, token).then((r) => {
            hotels = r
          }),
        )
      }
      if (includeActivities) {
        tasks.push(
          fetchActivitiesForDestination(
            options.destination,
            options.maxResultsPerCategory,
            token,
          ).then((r) => {
            activities = r
          }),
        )
      }

      await Promise.all(tasks)

      return {
        flights,
        hotels,
        cars: [],
        activities,
      }
    },

    async searchActivities(options: SearchActivitiesOptions): Promise<ActivityOffer[]> {
      const token = await tokenCache.getToken()
      if (typeof options.destination === 'string') {
        return fetchActivitiesForDestination(options.destination, options.maxResults, token)
      }
      const { lat, lon } = options.destination
      return fetchActivitiesAtPoint(lat, lon, options.maxResults, token)
    },

    /**
     * Searches for car-rental offers.
     *
     * Amadeus does not expose a public car-rental API as of v22 — the
     * "Cars Search" Self-Service product was deprecated and never
     * replaced. Rather than throwing, this method returns an empty
     * array so callers can render "no cars available" without a
     * provider-specific error path. To wire car inventory into a
     * Molecule app, swap in a different bond (e.g. Travelport or a
     * direct Hertz/Avis affiliate integration) for the `'travel'`
     * bond category.
     *
     * @param _options - Car-rental search criteria (ignored — see
     *   above).
     * @returns Always an empty array.
     */
    async searchCars(_options: SearchCarsOptions): Promise<CarOffer[]> {
      return []
    },
  }
}

/** Lazily-initialized default provider. */
let _provider: TravelProvider | null = null

/**
 * The default provider implementation, lazily initialized on first
 * use.
 *
 * Reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`,
 * `AMADEUS_USE_PRODUCTION`, and `AMADEUS_BASE_URL` from environment
 * variables. Use {@link createProvider} directly if you need to supply
 * configuration programmatically.
 */
export const provider: TravelProvider = new Proxy({} as TravelProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['AMADEUS_CLIENT_ID'] ? { clientId: process.env['AMADEUS_CLIENT_ID'] } : {}),
        ...(process.env['AMADEUS_CLIENT_SECRET']
          ? { clientSecret: process.env['AMADEUS_CLIENT_SECRET'] }
          : {}),
        ...(process.env['AMADEUS_USE_PRODUCTION'] === 'true' ? { useProduction: true } : {}),
        ...(process.env['AMADEUS_BASE_URL'] ? { baseUrl: process.env['AMADEUS_BASE_URL'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
