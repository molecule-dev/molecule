/**
 * Amadeus implementation of {@link FlightsProvider}.
 *
 * Wraps the Amadeus Self-Service v2 flight-offers and v1 flight-offers
 * pricing endpoints. The default base URL is the Self-Service test
 * sandbox (`https://test.api.amadeus.com`); set `AMADEUS_USE_PRODUCTION=true`
 * (or {@link AmadeusFlightsConfig.useProduction}) to route to production.
 *
 * Auth is OAuth2 client_credentials. The provider caches the access token
 * until just before its declared expiry and transparently refreshes on
 * 401 responses.
 *
 * Amadeus requires the **original** flight-offer payload to price (not
 * just its id), so the provider keeps a bounded LRU cache of offers
 * returned from `searchFlights` and looks them up on `getOffer` /
 * `priceOffer`. Calling `getOffer`/`priceOffer` with an id that has not
 * been searched throws {@link AmadeusUnknownOfferError}.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AirportCode,
  CabinClass,
  CarrierCode,
  CurrencyCode,
  FlightOffer,
  FlightOfferDetail,
  FlightsProvider,
  IsoDateTime,
  IsoDuration,
  OfferId,
  PricingResult,
  SearchFlightsOptions,
  Segment,
  SegmentEndpoint,
  TravelerPricing,
} from '@molecule/api-flights'

import type { AmadeusFlightsConfig } from './types.js'
import {
  AmadeusMissingCredentialsError,
  AmadeusRateLimitedError,
  AmadeusUnknownOfferError,
  AmadeusUpstreamError,
} from './types.js'

/** Default Self-Service test (sandbox) base URL. */
const DEFAULT_TEST_BASE_URL = 'https://test.api.amadeus.com'

/** Default production base URL. */
const DEFAULT_PRODUCTION_BASE_URL = 'https://api.amadeus.com'

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT = 15_000

/** Default offer cache size. */
const DEFAULT_OFFER_CACHE_SIZE = 1000

/**
 * Number of seconds shaved off the OAuth token expiry to avoid edge-case
 *  races where the token expires mid-request.
 */
const TOKEN_EXPIRY_SAFETY_MARGIN_S = 30

/** Default cabin class when the caller omits the option. */
const DEFAULT_CABIN: CabinClass = 'economy'

/** Default adult passenger count. */
const DEFAULT_ADULTS = 1

/**
 * Maps the abstract {@link CabinClass} onto the Amadeus `travelClass`
 * enum.
 */
const CABIN_TO_AMADEUS: Record<CabinClass, string> = {
  economy: 'ECONOMY',
  'premium-economy': 'PREMIUM_ECONOMY',
  business: 'BUSINESS',
  first: 'FIRST',
}

/** Reverse of {@link CABIN_TO_AMADEUS}. */
const AMADEUS_TO_CABIN: Record<string, CabinClass> = {
  ECONOMY: 'economy',
  PREMIUM_ECONOMY: 'premium-economy',
  BUSINESS: 'business',
  FIRST: 'first',
}

/**
 * Maps the Amadeus traveler-type enum onto the abstract
 * {@link TravelerPricing.travelerType}.
 */
const AMADEUS_TO_TRAVELER_TYPE: Record<string, TravelerPricing['travelerType']> = {
  ADULT: 'adult',
  CHILD: 'child',
  HELD_INFANT: 'held-infant',
  SEATED_INFANT: 'seated-infant',
}

/**
 * Raw OAuth2 token response shape.
 */
interface TokenResponse {
  /** Bearer token string. */
  access_token: string
  /** Lifetime, in seconds. */
  expires_in: number
  /** Always `'Bearer'` for client_credentials. */
  token_type: string
}

/**
 * Raw single segment shape from `/v2/shopping/flight-offers`.
 */
interface AmadeusSegment {
  departure: { iataCode: string; at: string; terminal?: string }
  arrival: { iataCode: string; at: string; terminal?: string }
  carrierCode: string
  number: string
  aircraft?: { code: string }
  duration?: string
}

/**
 * Raw itinerary inside an Amadeus flight offer.
 */
interface AmadeusItinerary {
  duration?: string
  segments: AmadeusSegment[]
}

/**
 * Raw fare detail shape inside `travelerPricings[].fareDetailsBySegment`.
 */
interface AmadeusFareDetail {
  segmentId: string
  cabin?: string
}

/**
 * Raw `travelerPricings` row from a flight offer.
 */
interface AmadeusTravelerPricing {
  travelerId: string
  travelerType: string
  price?: { total?: string; currency?: string }
  fareDetailsBySegment?: AmadeusFareDetail[]
}

/**
 * Raw flight-offer object returned by Amadeus search and pricing
 * endpoints. Only the fields the provider maps are typed.
 */
export interface AmadeusFlightOffer {
  type: string
  id: string
  itineraries: AmadeusItinerary[]
  price: { total: string; currency: string; grandTotal?: string }
  travelerPricings?: AmadeusTravelerPricing[]
  [key: string]: unknown
}

/**
 * Raw search response shape.
 */
interface SearchResponse {
  data: AmadeusFlightOffer[]
}

/**
 * Raw pricing response shape.
 */
interface PricingResponse {
  data: {
    type: string
    flightOffers: AmadeusFlightOffer[]
  }
}

/**
 * Resolves the effective base URL given the (possibly user-overridden)
 * config.
 *
 * @param config - Provider configuration.
 * @returns The base URL to call.
 */
const resolveBaseUrl = (config: AmadeusFlightsConfig): string => {
  if (config.baseUrl) {
    return config.baseUrl
  }
  return config.useProduction ? DEFAULT_PRODUCTION_BASE_URL : DEFAULT_TEST_BASE_URL
}

/**
 * Parses a `Retry-After` header value into a number of seconds.
 *
 * The header may be either a delta-seconds integer or an HTTP-date.
 *
 * @param value - Raw header value (`null` when absent).
 * @returns Number of seconds to wait, or `null` if the header is absent
 *   or unparseable.
 */
const parseRetryAfter = (value: string | null): number | null => {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  const asInt = Number(trimmed)
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.floor(asInt)
  }
  const asDate = Date.parse(trimmed)
  if (Number.isFinite(asDate)) {
    const deltaMs = asDate - Date.now()
    if (deltaMs > 0) {
      return Math.ceil(deltaMs / 1000)
    }
    return 0
  }
  return null
}

/**
 * Maps a raw Amadeus segment to a normalized {@link Segment}.
 *
 * @param raw - Raw segment from Amadeus.
 * @returns Normalized segment.
 */
const mapSegment = (raw: AmadeusSegment): Segment => {
  const departure: SegmentEndpoint = {
    airport: raw.departure.iataCode as AirportCode,
    at: raw.departure.at as IsoDateTime,
    terminal: raw.departure.terminal ?? null,
  }
  const arrival: SegmentEndpoint = {
    airport: raw.arrival.iataCode as AirportCode,
    at: raw.arrival.at as IsoDateTime,
    terminal: raw.arrival.terminal ?? null,
  }
  return {
    departure,
    arrival,
    carrier: raw.carrierCode as CarrierCode,
    flightNumber: raw.number,
    aircraft: raw.aircraft?.code ?? null,
    duration: (raw.duration as IsoDuration | undefined) ?? null,
  }
}

/**
 * Sums itinerary durations into a single ISO 8601 duration string. Returns
 * `'PT0M'` when no per-itinerary duration is present.
 *
 * Amadeus only supplies hours / minutes in itinerary durations, so the
 * implementation parses that subset rather than depending on a full ISO
 * 8601 duration library.
 *
 * @param itineraries - Raw Amadeus itineraries.
 * @returns ISO 8601 duration string covering all itineraries.
 */
const sumItineraryDurations = (itineraries: AmadeusItinerary[]): IsoDuration => {
  let totalMinutes = 0
  for (const it of itineraries) {
    if (!it.duration) {
      continue
    }
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(it.duration)
    if (!match) {
      continue
    }
    const hours = match[1] ? parseInt(match[1], 10) : 0
    const minutes = match[2] ? parseInt(match[2], 10) : 0
    totalMinutes += hours * 60 + minutes
  }
  if (totalMinutes === 0) {
    return 'PT0M'
  }
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  if (hh === 0) {
    return `PT${String(mm)}M`
  }
  if (mm === 0) {
    return `PT${String(hh)}H`
  }
  return `PT${String(hh)}H${String(mm)}M`
}

/**
 * Picks the most representative cabin from a traveler-pricing row. The
 * cabin can vary per segment in Amadeus; we surface the first segment's
 * cabin and `null` if cabins differ across segments.
 *
 * @param row - Raw traveler-pricing row.
 * @returns Normalized cabin, or `null` when ambiguous / absent.
 */
const pickTravelerCabin = (row: AmadeusTravelerPricing): CabinClass | null => {
  const fareDetails = row.fareDetailsBySegment ?? []
  if (fareDetails.length === 0) {
    return null
  }
  const firstCabin = fareDetails[0]?.cabin
  if (!firstCabin) {
    return null
  }
  const allSame = fareDetails.every((d) => d.cabin === firstCabin)
  if (!allSame) {
    return null
  }
  return AMADEUS_TO_CABIN[firstCabin] ?? null
}

/**
 * Maps an Amadeus traveler-pricing row to a normalized
 * {@link TravelerPricing}.
 *
 * @param row - Raw traveler-pricing row.
 * @returns Normalized traveler pricing.
 */
const mapTravelerPricing = (row: AmadeusTravelerPricing): TravelerPricing => {
  const total = row.price?.total ? Number(row.price.total) : 0
  const travelerType = AMADEUS_TO_TRAVELER_TYPE[row.travelerType] ?? 'adult'
  return {
    travelerId: row.travelerId,
    travelerType,
    price: total,
    cabin: pickTravelerCabin(row),
  }
}

/**
 * Maps a raw Amadeus flight offer to a normalized {@link FlightOffer}.
 *
 * @param raw - Raw flight offer.
 * @returns Normalized flight offer.
 */
const mapOffer = (raw: AmadeusFlightOffer): FlightOffer => {
  const segments: Segment[] = []
  for (const it of raw.itineraries) {
    for (const s of it.segments) {
      segments.push(mapSegment(s))
    }
  }
  const totalRaw = raw.price.grandTotal ?? raw.price.total
  return {
    id: raw.id as OfferId,
    price: Number(totalRaw),
    currency: raw.price.currency as CurrencyCode,
    segments,
    duration: sumItineraryDurations(raw.itineraries),
  }
}

/**
 * Maps a raw Amadeus flight offer to a normalized
 * {@link FlightOfferDetail}.
 *
 * @param raw - Raw flight offer.
 * @returns Normalized flight offer detail.
 */
const mapOfferDetail = (raw: AmadeusFlightOffer): FlightOfferDetail => {
  const base = mapOffer(raw)
  const travelerPricings = raw.travelerPricings
    ? raw.travelerPricings.map(mapTravelerPricing)
    : null
  return { ...base, travelerPricings }
}

/**
 * Bounded FIFO offer cache. Maps offer id → raw Amadeus offer payload.
 *
 * Implemented with a `Map` (which preserves insertion order in modern
 * runtimes) so we can evict the oldest entry when capacity is exceeded.
 */
class OfferCache {
  private readonly capacity: number
  private readonly entries = new Map<string, AmadeusFlightOffer>()

  public constructor(capacity: number) {
    this.capacity = capacity
  }

  /**
   * Inserts or updates an offer entry, evicting the oldest when capacity is exceeded.
   */
  public set(id: string, offer: AmadeusFlightOffer): void {
    if (this.entries.has(id)) {
      this.entries.delete(id)
    }
    this.entries.set(id, offer)
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) {
        break
      }
      this.entries.delete(oldest)
    }
  }

  /**
   * Retrieves an offer by id, or `undefined` if not cached.
   */
  public get(id: string): AmadeusFlightOffer | undefined {
    return this.entries.get(id)
  }
}

/**
 * Internal access-token holder.
 */
interface TokenState {
  /** Current bearer token, or `null` if none has been fetched yet. */
  value: string | null
  /** Wall-clock millisecond timestamp at which `value` becomes invalid. */
  expiresAtMs: number
}

/**
 * Performs the OAuth2 client_credentials handshake.
 *
 * @param baseUrl - Provider base URL.
 * @param clientId - Configured client id.
 * @param clientSecret - Configured client secret.
 * @param timeout - Request timeout, in ms.
 * @returns The fresh token response.
 * @throws {AmadeusRateLimitedError} On HTTP 429.
 * @throws {AmadeusUpstreamError} On any other non-OK status.
 */
const fetchToken = async (
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  timeout: number,
): Promise<TokenResponse> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })
  try {
    const response = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: controller.signal,
    })
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      throw new AmadeusRateLimitedError(
        'Amadeus OAuth token request rate limited (HTTP 429)',
        retryAfter,
      )
    }
    if (!response.ok) {
      throw new AmadeusUpstreamError(response.status)
    }
    return (await response.json()) as TokenResponse
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Performs an authenticated request against Amadeus and parses the JSON
 * response.
 *
 * The configured client id / secret is never included in error messages
 * — they are sent only in the OAuth body, never in URLs or auth-failure
 * messages.
 *
 * @template T - Expected JSON response shape.
 * @param url - Fully-constructed request URL.
 * @param init - Fetch init options (method, body, headers).
 * @param token - Current bearer token.
 * @param timeout - Request timeout, in ms.
 * @returns Parsed JSON body cast to `T`.
 * @throws {AmadeusRateLimitedError} On HTTP 429.
 * @throws {AmadeusUpstreamError} On any other non-OK status.
 */
const fetchAuthenticated = async <T>(
  url: string,
  init: { method: 'GET' | 'POST'; body?: string },
  token: string,
  timeout: number,
): Promise<T> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (init.body) {
    headers['Content-Type'] = 'application/vnd.amadeus+json'
  }
  try {
    const response = await fetch(url, {
      method: init.method,
      headers,
      ...(init.body ? { body: init.body } : {}),
      signal: controller.signal,
    })
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      throw new AmadeusRateLimitedError('Amadeus API rate limit exceeded (HTTP 429)', retryAfter)
    }
    if (!response.ok) {
      throw new AmadeusUpstreamError(response.status)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Builds the `/v2/shopping/flight-offers` query URL.
 *
 * @param baseUrl - Base API URL.
 * @param options - Search options.
 * @returns Fully-constructed request URL.
 */
const buildSearchUrl = (baseUrl: string, options: SearchFlightsOptions): string => {
  const cabin = options.cabin ?? DEFAULT_CABIN
  const params = new URLSearchParams({
    originLocationCode: options.origin,
    destinationLocationCode: options.destination,
    departureDate: options.departureDate,
    adults: String(options.adults ?? DEFAULT_ADULTS),
    travelClass: CABIN_TO_AMADEUS[cabin],
    nonStop: 'false',
  })
  if (options.returnDate) {
    params.set('returnDate', options.returnDate)
  }
  if (options.children !== undefined && options.children > 0) {
    params.set('children', String(options.children))
  }
  if (options.infants !== undefined && options.infants > 0) {
    params.set('infants', String(options.infants))
  }
  if (options.maxResults !== undefined && options.maxResults > 0) {
    params.set('max', String(options.maxResults))
  }
  return `${baseUrl}/v2/shopping/flight-offers?${params.toString()}`
}

/**
 * Builds the `/v1/shopping/flight-offers/pricing` URL.
 *
 * @param baseUrl - Base API URL.
 * @returns Fully-constructed request URL.
 */
const buildPricingUrl = (baseUrl: string): string => `${baseUrl}/v1/shopping/flight-offers/pricing`

/**
 * Creates an Amadeus flights provider.
 *
 * @param config - Provider configuration. All fields are optional but
 *   `clientId` / `clientSecret` (or their env vars) MUST be set before
 *   any method is invoked.
 * @returns A {@link FlightsProvider} backed by the Amadeus Self-Service
 *   API.
 */
export const createProvider = (config: AmadeusFlightsConfig = {}): FlightsProvider => {
  const baseUrl = resolveBaseUrl(config)
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const cache = new OfferCache(config.offerCacheSize ?? DEFAULT_OFFER_CACHE_SIZE)
  const token: TokenState = { value: null, expiresAtMs: 0 }

  const ensureCredentials = (): { id: string; secret: string } => {
    const id = config.clientId
    const secret = config.clientSecret
    if (!id || !secret) {
      throw new AmadeusMissingCredentialsError()
    }
    return { id, secret }
  }

  const ensureToken = async (): Promise<string> => {
    const now = Date.now()
    if (token.value && now < token.expiresAtMs) {
      return token.value
    }
    const { id, secret } = ensureCredentials()
    const fresh = await fetchToken(baseUrl, id, secret, timeout)
    token.value = fresh.access_token
    token.expiresAtMs = now + Math.max(0, (fresh.expires_in - TOKEN_EXPIRY_SAFETY_MARGIN_S) * 1000)
    return token.value
  }

  return {
    async searchFlights(options: SearchFlightsOptions): Promise<FlightOffer[]> {
      ensureCredentials()
      const url = buildSearchUrl(baseUrl, options)
      const accessToken = await ensureToken()
      const data = await fetchAuthenticated<SearchResponse>(
        url,
        { method: 'GET' },
        accessToken,
        timeout,
      )
      const offers = data.data
      for (const raw of offers) {
        cache.set(raw.id, raw)
      }
      return offers.map(mapOffer)
    },

    async getOffer(offerId: OfferId): Promise<FlightOfferDetail> {
      const cached = cache.get(offerId)
      if (!cached) {
        throw new AmadeusUnknownOfferError(offerId)
      }
      ensureCredentials()
      const url = buildPricingUrl(baseUrl)
      const accessToken = await ensureToken()
      const body = JSON.stringify({
        data: { type: 'flight-offers-pricing', flightOffers: [cached] },
      })
      const data = await fetchAuthenticated<PricingResponse>(
        url,
        { method: 'POST', body },
        accessToken,
        timeout,
      )
      const priced = data.data.flightOffers[0]
      if (!priced) {
        throw new AmadeusUpstreamError(502)
      }
      return mapOfferDetail(priced)
    },

    async priceOffer(offerId: OfferId): Promise<PricingResult> {
      const cached = cache.get(offerId)
      if (!cached) {
        throw new AmadeusUnknownOfferError(offerId)
      }
      ensureCredentials()
      const url = buildPricingUrl(baseUrl)
      const accessToken = await ensureToken()
      const body = JSON.stringify({
        data: { type: 'flight-offers-pricing', flightOffers: [cached] },
      })
      const data = await fetchAuthenticated<PricingResponse>(
        url,
        { method: 'POST', body },
        accessToken,
        timeout,
      )
      const priced = data.data.flightOffers[0]
      if (!priced) {
        throw new AmadeusUpstreamError(502)
      }
      const totalRaw = priced.price.grandTotal ?? priced.price.total
      const travelerPricings = priced.travelerPricings
        ? priced.travelerPricings.map(mapTravelerPricing)
        : null
      return {
        offerId,
        price: Number(totalRaw),
        currency: priced.price.currency as CurrencyCode,
        travelerPricings,
        pricedAt: new Date(),
      }
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: FlightsProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`,
 * `AMADEUS_USE_PRODUCTION`, and `AMADEUS_BASE_URL` from environment
 * variables.
 */
export const provider: FlightsProvider = new Proxy({} as FlightsProvider, {
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
