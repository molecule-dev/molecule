/**
 * Amadeus implementation of HotelsProvider.
 *
 * Wraps the Amadeus Self-Service hotels APIs:
 *
 * - `GET /v1/reference-data/locations/hotels/by-city` — list hotels in a
 *   city (used as the catalogue lookup behind a city-coded search).
 * - `GET /v1/reference-data/locations/hotels/by-geocode` — list hotels
 *   within a radius around a geographic point.
 * - `GET /v3/shopping/hotel-offers` — priced offers for one or more
 *   hotels, used both as the search-result body (when many hotelIds
 *   are batched) and as the `getHotelOffers` per-hotel call.
 *
 * Authentication uses the same OAuth2 client-credentials flow as
 * `@molecule/api-flights-amadeus`: the bond mints a token via
 * `POST /v1/security/oauth2/token` and caches it per-provider-instance
 * until it expires. The same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`
 * env vars work for both bonds — flights and hotels are different
 * products on the same Amadeus account.
 *
 * Direct booking is intentionally not supported: Amadeus's hotel-booking
 * endpoint requires PCI-compliant card capture and a custom integration
 * contract. {@link HotelsProvider.bookHotel} therefore throws with
 * `cause.code === 'BOOKING_NOT_SUPPORTED'`; callers should fall back to
 * Amadeus's hosted checkout / redirect flow.
 *
 * Credentials NEVER appear in error messages or logs. URLs that include
 * a query string are passed through as-is (no API key in URL), and the
 * client secret never appears in any error path.
 *
 * @module
 */

import type {
  HotelAddress,
  HotelBooking,
  HotelGuestInfo,
  HotelId,
  HotelOffer,
  HotelOfferId,
  HotelOffersCriteria,
  HotelSearchCriteria,
  HotelSearchResult,
  HotelsProvider,
} from '@molecule/api-hotels'

import type { AmadeusHotelsConfig } from './types.js'
import {
  BOOKING_NOT_SUPPORTED,
  MISSING_CREDENTIALS,
  TOKEN_MINT_FAILED,
  UPSTREAM_ERROR,
} from './types.js'

/** Default Amadeus production endpoint base URL. */
const DEFAULT_BASE_URL = 'https://api.amadeus.com'

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default token-skew window in seconds. */
const DEFAULT_TOKEN_SKEW_SECONDS = 30

/**
 * Maximum number of hotelIds the provider will batch into a single
 * `/v3/shopping/hotel-offers` call when fanning out a city-coded
 * search. Amadeus enforces a `hotelIds` length limit; 20 is a safe
 * default for the production tier.
 */
const HOTEL_IDS_BATCH_SIZE = 20

/** OAuth2 token-cache slot for one provider instance. */
interface CachedToken {
  /** The bearer token string returned by Amadeus. */
  accessToken: string
  /** Epoch milliseconds when the token expires (already includes skew). */
  expiresAtMs: number
}

/** Shape of a successful Amadeus OAuth2 token response. */
interface AmadeusTokenResponse {
  /** Bearer token. */
  access_token: string
  /** Lifetime in seconds (e.g. `1799`). */
  expires_in: number
  /** Token type (always `'Bearer'`). */
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

/**
 * A single row from `/v1/reference-data/locations/hotels/by-city` or
 * `.../by-geocode`.
 */
interface AmadeusHotelLocationRow {
  hotelId?: string
  name?: string
  iataCode?: string
  rating?: string | number
  geoCode?: { latitude?: number; longitude?: number }
  address?: {
    countryCode?: string
    cityName?: string
    lines?: string[]
    postalCode?: string
  }
  distance?: { value?: number; unit?: string }
}

/** Response envelope for the hotels reference-data endpoints. */
interface AmadeusHotelLocationResponse extends AmadeusErrorEnvelope {
  data?: AmadeusHotelLocationRow[]
}

/**
 * A single offer row inside `data[].offers[]` from
 * `/v3/shopping/hotel-offers`.
 */
interface AmadeusOfferRow {
  id?: string
  checkInDate?: string
  checkOutDate?: string
  rateCode?: string
  guests?: { adults?: number }
  room?: {
    description?: { text?: string }
    typeEstimated?: { category?: string; beds?: number }
  }
  price?: {
    total?: string
    currency?: string
  }
  policies?: {
    cancellations?: Array<{ type?: string; numberOfNights?: number }>
  }
}

/** A single hit in `/v3/shopping/hotel-offers`. */
interface AmadeusHotelOffersHit {
  hotel?: {
    hotelId?: string
    name?: string
    cityCode?: string
    latitude?: number
    longitude?: number
    address?: {
      countryCode?: string
      cityName?: string
      lines?: string[]
      postalCode?: string
    }
  }
  offers?: AmadeusOfferRow[]
}

/** Response envelope for `/v3/shopping/hotel-offers`. */
interface AmadeusHotelOffersResponse extends AmadeusErrorEnvelope {
  data?: AmadeusHotelsHit[] | AmadeusHotelOffersHit[]
}

/** Hotel-offers data row alias for readability. */
type AmadeusHotelsHit = AmadeusHotelOffersHit

/**
 * Returns a sanitized copy of an error message body. Currently a no-op
 * passthrough for the common "errors[].detail" shape — exposed for
 * symmetry with the flights bond and to keep the redaction surface
 * documented in one place.
 *
 * @param message - A free-form upstream error message.
 * @returns The same message, with any future-redacted patterns scrubbed.
 */
export const sanitizeErrorMessage = (message: string): string => {
  return message
}

/**
 * Resolves the configured client credentials, throwing a sanitized error
 * (NEVER containing the secret) if either is missing.
 *
 * @param config - Provider configuration.
 * @returns Resolved `{ clientId, clientSecret }` pair.
 * @throws {Error} If credentials are not configured.
 */
const requireCredentials = (
  config: AmadeusHotelsConfig,
): { clientId: string; clientSecret: string } => {
  const clientId = config.clientId ?? process.env['AMADEUS_CLIENT_ID']
  const clientSecret = config.clientSecret ?? process.env['AMADEUS_CLIENT_SECRET']
  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new Error(
      'Amadeus credentials not configured. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET, or pass clientId/clientSecret to createProvider().',
      { cause: { code: MISSING_CREDENTIALS } },
    )
  }
  if (typeof clientSecret !== 'string' || clientSecret.length === 0) {
    throw new Error(
      'Amadeus credentials not configured. Set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET, or pass clientId/clientSecret to createProvider().',
      { cause: { code: MISSING_CREDENTIALS } },
    )
  }
  return { clientId, clientSecret }
}

/**
 * Asserts that an Amadeus error envelope is empty; if it carries an
 * `errors[]` block, throws an upstream error with the title/detail
 * surfaced (never the raw secret).
 *
 * @param body - Parsed JSON response from Amadeus.
 * @throws {Error} If `body.errors[]` is non-empty.
 */
const detectUpstreamError = (body: AmadeusErrorEnvelope): void => {
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0]
    const detail = first?.detail ?? first?.title ?? 'Unknown Amadeus error'
    throw new Error(`Amadeus rejected the request: ${sanitizeErrorMessage(detail)}`, {
      cause: { code: UPSTREAM_ERROR },
    })
  }
}

/**
 * Mints a fresh OAuth2 token via `POST /v1/security/oauth2/token`. The
 * client_secret NEVER appears in any thrown error.
 *
 * @param baseUrl - Resolved Amadeus base URL.
 * @param clientId - OAuth2 client ID.
 * @param clientSecret - OAuth2 client secret.
 * @param timeout - Request timeout in milliseconds.
 * @returns Parsed token response.
 * @throws {Error} If the mint call fails. Message contains the HTTP
 *   status but never the secret.
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
      throw new Error(`Amadeus token mint failed with status ${String(response.status)}`, {
        cause: { code: TOKEN_MINT_FAILED },
      })
    }
    const parsed = (await response.json()) as AmadeusTokenResponse & AmadeusErrorEnvelope
    if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
      const detail = parsed.errors[0]?.detail ?? parsed.errors[0]?.title ?? 'Token mint rejected'
      throw new Error(`Amadeus token mint failed: ${sanitizeErrorMessage(detail)}`, {
        cause: { code: TOKEN_MINT_FAILED },
      })
    }
    if (typeof parsed.access_token !== 'string' || parsed.access_token.length === 0) {
      throw new Error('Amadeus token mint returned no access_token', {
        cause: { code: TOKEN_MINT_FAILED },
      })
    }
    return parsed
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Per-instance OAuth2 token cache. Closed over by the provider so the
 * same provider returned from {@link createProvider} caches a token
 * across calls without leaking state into module scope.
 */
interface TokenCache {
  /**
   * Returns a valid bearer token, minting and caching a new one if
   * none is cached or the cached one has expired.
   */
  getToken(): Promise<string>
}

/**
 * Builds a {@link TokenCache} closure for one provider instance. The
 * cache is keyed implicitly by the provider's `clientId` /
 * `clientSecret` — different provider instances do NOT share token
 * caches (which is the safe default for multi-tenant setups).
 *
 * @param baseUrl - Resolved Amadeus base URL.
 * @param config - Provider configuration. Credentials are re-resolved
 *   on every call so env-var changes are picked up between requests.
 * @param timeout - Request timeout in milliseconds.
 * @param skewSeconds - Number of seconds to subtract from the upstream
 *   `expires_in` value before treating the cached token as stale.
 * @returns A {@link TokenCache} bound to this provider instance.
 */
const createTokenCache = (
  baseUrl: string,
  config: AmadeusHotelsConfig,
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
 * Issues an authenticated GET against an Amadeus data endpoint and parses
 * the JSON response. Rejects with a sanitized {@link UPSTREAM_ERROR} on
 * non-OK statuses or structured `errors[]` envelopes.
 *
 * @param baseUrl - Resolved Amadeus base URL.
 * @param path - Path beginning with `/` (e.g. `'/v3/shopping/hotel-offers'`).
 * @param params - Query parameters (excluding auth — that is handled
 *   via the `Authorization` header).
 * @param token - Bearer access token.
 * @param timeout - Request timeout in milliseconds.
 * @returns Parsed JSON body, narrowed by `T`.
 * @throws {Error} If the upstream returns a non-OK status or an
 *   `errors[]` body. Errors NEVER contain the OAuth secret.
 */
const fetchAmadeus = async <T extends AmadeusErrorEnvelope>(
  baseUrl: string,
  path: string,
  params: URLSearchParams,
  token: string,
  timeout: number,
): Promise<T> => {
  const url = `${baseUrl}${path}?${params.toString()}`
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
      // Try to parse the body for a structured error message; fall back
      // to the bare HTTP status. We intentionally do not include the
      // bearer token or any header in the error message.
      let detail: string | undefined
      try {
        const body = (await response.json()) as AmadeusErrorEnvelope
        detail = body.errors?.[0]?.detail ?? body.errors?.[0]?.title
      } catch (_error) {
        // Ignore JSON parse failures; the status is enough.
      }
      const suffix = detail ? `: ${sanitizeErrorMessage(detail)}` : ''
      throw new Error(
        `Amadeus request to ${path} failed with status ${String(response.status)}${suffix}`,
        { cause: { code: UPSTREAM_ERROR } },
      )
    }
    const parsed = (await response.json()) as T
    detectUpstreamError(parsed)
    return parsed
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parses an Amadeus rating field, which may be a stringified integer
 * (`'5'`) or a number, into a plain number. Returns `undefined` for
 * unparseable / missing values.
 *
 * @param value - Amadeus `rating` value.
 * @returns Parsed integer rating, or `undefined`.
 */
const parseOptionalNumber = (value: string | number | undefined): number | undefined => {
  if (value == null) return undefined
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (value === '' || value === 'None') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Common address shape between reference-data and offers responses. */
interface AmadeusAddressRaw {
  countryCode?: string
  cityName?: string
  lines?: string[]
  postalCode?: string
}

/**
 * Maps an Amadeus address block to a normalized {@link HotelAddress}.
 *
 * @param raw - Amadeus address block.
 * @returns Normalized address, or `undefined` if no fields are populated.
 */
const mapAddress = (raw: AmadeusAddressRaw | undefined): HotelAddress | undefined => {
  if (!raw) return undefined
  const out: HotelAddress = {}
  if (typeof raw.countryCode === 'string' && raw.countryCode.length > 0) {
    out.countryCode = raw.countryCode
  }
  if (typeof raw.cityName === 'string' && raw.cityName.length > 0) {
    out.cityName = raw.cityName
  }
  if (Array.isArray(raw.lines) && raw.lines.length > 0) {
    const joined = raw.lines.filter((l) => typeof l === 'string' && l.length > 0).join(', ')
    if (joined.length > 0) {
      out.line = joined
    }
  }
  if (typeof raw.postalCode === 'string' && raw.postalCode.length > 0) {
    out.postalCode = raw.postalCode
  }
  return Object.keys(out).length === 0 ? undefined : out
}

/**
 * Maps an Amadeus reference-data hotel row to a normalized
 * {@link HotelSearchResult}. Search-result rows from this endpoint have
 * no price block — those are filled in via a follow-up offers call.
 *
 * @param row - Amadeus reference-data row.
 * @returns Normalized search result, or `undefined` if the row has no
 *   `hotelId` (impossible per the spec but defensive).
 */
const mapLocationRow = (row: AmadeusHotelLocationRow): HotelSearchResult | undefined => {
  if (typeof row.hotelId !== 'string' || row.hotelId.length === 0) {
    return undefined
  }
  const hit: HotelSearchResult = {
    hotelId: row.hotelId,
    name: row.name ?? row.hotelId,
  }
  if (typeof row.iataCode === 'string' && row.iataCode.length > 0) {
    hit.cityCode = row.iataCode
  }
  const rating = parseOptionalNumber(row.rating)
  if (rating !== undefined) {
    hit.rating = rating
  }
  if (row.geoCode) {
    if (typeof row.geoCode.latitude === 'number') hit.latitude = row.geoCode.latitude
    if (typeof row.geoCode.longitude === 'number') hit.longitude = row.geoCode.longitude
  }
  const address = mapAddress(row.address)
  if (address) hit.address = address
  if (row.distance && typeof row.distance.value === 'number') {
    hit.distance = row.distance.value
  }
  return hit
}

/**
 * Maps an Amadeus offer row to a normalized {@link HotelOffer}.
 *
 * @param hotelId - Hotel the offer belongs to (echoed for convenience).
 * @param offer - Amadeus offer row.
 * @returns Normalized offer, or `undefined` if the row lacks the
 *   required `id` / `price` fields.
 */
const mapOffer = (hotelId: HotelId, offer: AmadeusOfferRow): HotelOffer | undefined => {
  if (
    typeof offer.id !== 'string' ||
    offer.id.length === 0 ||
    typeof offer.checkInDate !== 'string' ||
    typeof offer.checkOutDate !== 'string' ||
    !offer.price ||
    typeof offer.price.total !== 'string' ||
    typeof offer.price.currency !== 'string'
  ) {
    return undefined
  }
  const total = Number(offer.price.total)
  if (!Number.isFinite(total)) {
    return undefined
  }
  const out: HotelOffer = {
    offerId: offer.id,
    hotelId,
    checkInDate: offer.checkInDate,
    checkOutDate: offer.checkOutDate,
    price: { total, currency: offer.price.currency },
  }
  const description = offer.room?.description?.text
  if (typeof description === 'string' && description.length > 0) {
    out.roomDescription = description
  }
  if (typeof offer.guests?.adults === 'number') {
    out.adults = offer.guests.adults
  }
  if (typeof offer.rateCode === 'string' && offer.rateCode.length > 0) {
    out.rateCode = offer.rateCode
  }
  if (Array.isArray(offer.policies?.cancellations)) {
    // Heuristic: any cancellation policy with `numberOfNights === 0` is
    // treated as fully refundable; presence of any `type === 'CANCELLATION'`
    // with non-zero penalty is treated as non-refundable. Unknown shapes
    // leave the field undefined.
    const policies = offer.policies.cancellations
    if (policies.length === 0) {
      out.refundable = true
    } else if (policies.every((p) => (p?.numberOfNights ?? 0) === 0)) {
      out.refundable = true
    } else if (policies.some((p) => (p?.numberOfNights ?? 0) > 0)) {
      out.refundable = false
    }
  }
  return out
}

/**
 * Builds an `ISO YYYY-MM-DD` formatted date validator. Amadeus rejects
 * dates that are not in this exact form, so we surface the issue locally
 * before round-tripping through the upstream.
 *
 * @param value - Candidate date string.
 * @returns `true` if {@link value} is a valid `YYYY-MM-DD` string.
 */
const isIsoDate = (value: unknown): value is string => {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)
}

/**
 * Splits an array into fixed-size chunks. Used to batch hotelIds when
 * fanning out a city-coded search into a price-aware offers call.
 *
 * @param items - Source array.
 * @param size - Maximum chunk size (must be >= 1).
 * @returns Array of chunks (last chunk may be shorter than {@link size}).
 */
const chunk = <T>(items: T[], size: number): T[][] => {
  if (size < 1) return [items]
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/**
 * Creates an Amadeus hotels provider.
 *
 * @param config - Provider configuration. Credentials may be supplied
 *   here directly or via the `AMADEUS_CLIENT_ID` and
 *   `AMADEUS_CLIENT_SECRET` environment variables.
 * @returns A {@link HotelsProvider} backed by Amadeus.
 */
export const createProvider = (config: AmadeusHotelsConfig = {}): HotelsProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const skewSeconds = config.tokenSkewSeconds ?? DEFAULT_TOKEN_SKEW_SECONDS
  const tokenCache = createTokenCache(baseUrl, config, timeout, skewSeconds)

  return {
    async searchHotels(criteria: HotelSearchCriteria): Promise<HotelSearchResult[]> {
      if (!isIsoDate(criteria.checkInDate) || !isIsoDate(criteria.checkOutDate)) {
        throw new Error('checkInDate and checkOutDate must be ISO YYYY-MM-DD strings', {
          cause: { code: UPSTREAM_ERROR },
        })
      }
      if (!criteria.cityCode && !criteria.location) {
        throw new Error('searchHotels requires either cityCode or location', {
          cause: { code: UPSTREAM_ERROR },
        })
      }

      const token = await tokenCache.getToken()

      // Step 1: list hotels in the requested area via the appropriate
      // reference-data endpoint.
      let locationsPath: string
      const locationsParams = new URLSearchParams()
      if (criteria.location) {
        locationsPath = '/v1/reference-data/locations/hotels/by-geocode'
        locationsParams.set('latitude', String(criteria.location.lat))
        locationsParams.set('longitude', String(criteria.location.lon))
        if (typeof criteria.location.radius === 'number') {
          locationsParams.set('radius', String(criteria.location.radius))
        }
      } else {
        locationsPath = '/v1/reference-data/locations/hotels/by-city'
        locationsParams.set('cityCode', criteria.cityCode as string)
      }
      if (Array.isArray(criteria.ratings) && criteria.ratings.length > 0) {
        locationsParams.set('ratings', criteria.ratings.join(','))
      }

      const locations = await fetchAmadeus<AmadeusHotelLocationResponse>(
        baseUrl,
        locationsPath,
        locationsParams,
        token,
        timeout,
      )

      const baseHits: HotelSearchResult[] = []
      const idToHit = new Map<HotelId, HotelSearchResult>()
      for (const row of locations.data ?? []) {
        const mapped = mapLocationRow(row)
        if (mapped) {
          baseHits.push(mapped)
          idToHit.set(mapped.hotelId, mapped)
        }
      }

      if (baseHits.length === 0) {
        return []
      }

      // Step 2: enrich with a "from price" snippet via batched
      // `/v3/shopping/hotel-offers` calls. Failures here are non-fatal
      // — the bare reference-data hits are still useful.
      const allIds = baseHits.map((h) => h.hotelId)
      const adults = criteria.adults ?? 1
      const rooms = criteria.rooms ?? 1
      for (const batch of chunk(allIds, HOTEL_IDS_BATCH_SIZE)) {
        const params = new URLSearchParams()
        params.set('hotelIds', batch.join(','))
        params.set('checkInDate', criteria.checkInDate)
        params.set('checkOutDate', criteria.checkOutDate)
        params.set('adults', String(adults))
        params.set('roomQuantity', String(rooms))
        try {
          const offers = await fetchAmadeus<AmadeusHotelOffersResponse>(
            baseUrl,
            '/v3/shopping/hotel-offers',
            params,
            token,
            timeout,
          )
          for (const hit of offers.data ?? []) {
            const id = hit.hotel?.hotelId
            if (typeof id !== 'string') continue
            const target = idToHit.get(id)
            if (!target) continue
            const cheapest = (hit.offers ?? [])
              .map((o) => mapOffer(id, o))
              .filter((o): o is HotelOffer => Boolean(o))
              .sort((a, b) => a.price.total - b.price.total)[0]
            if (cheapest) {
              target.fromPrice = { total: cheapest.price.total, currency: cheapest.price.currency }
            }
          }
        } catch (_error) {
          // Swallow per-batch enrichment failures — the search list is
          // still useful without prices, and an explicit getHotelOffers
          // call will surface any persistent upstream issue.
        }
      }

      return baseHits
    },

    async getHotelOffers(hotelId: HotelId, criteria: HotelOffersCriteria): Promise<HotelOffer[]> {
      if (!isIsoDate(criteria.checkInDate) || !isIsoDate(criteria.checkOutDate)) {
        throw new Error('checkInDate and checkOutDate must be ISO YYYY-MM-DD strings', {
          cause: { code: UPSTREAM_ERROR },
        })
      }
      const token = await tokenCache.getToken()
      const params = new URLSearchParams()
      params.set('hotelIds', hotelId)
      params.set('checkInDate', criteria.checkInDate)
      params.set('checkOutDate', criteria.checkOutDate)
      params.set('adults', String(criteria.adults ?? 1))

      const body = await fetchAmadeus<AmadeusHotelOffersResponse>(
        baseUrl,
        '/v3/shopping/hotel-offers',
        params,
        token,
        timeout,
      )

      const out: HotelOffer[] = []
      for (const hit of body.data ?? []) {
        const id = hit.hotel?.hotelId ?? hotelId
        for (const raw of hit.offers ?? []) {
          const offer = mapOffer(id, raw)
          if (offer) out.push(offer)
        }
      }
      return out
    },

    async bookHotel(_offerId: HotelOfferId, _guestInfo: HotelGuestInfo): Promise<HotelBooking> {
      // Amadeus's hotel-booking endpoint requires PCI-compliant card
      // capture and a per-tenant integration contract. Surfacing it
      // through this generic bond would be unsafe — callers should
      // redirect to Amadeus's hosted checkout / "price the offer" flow
      // and detect this error to do so.
      throw new Error(
        'Amadeus hotels bond does not support direct booking. Use the provider-hosted checkout flow.',
        { cause: { code: BOOKING_NOT_SUPPORTED } },
      )
    },
  }
}

/** Lazily-initialized default provider. */
let _provider: HotelsProvider | null = null

/**
 * The default provider implementation, lazily initialized on first use.
 *
 * Reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, and (optional)
 * `AMADEUS_BASE_URL` from environment variables. Use {@link createProvider}
 * directly if you need to supply configuration programmatically.
 */
export const provider: HotelsProvider = new Proxy({} as HotelsProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['AMADEUS_BASE_URL'] ? { baseUrl: process.env['AMADEUS_BASE_URL'] } : {}),
        ...(process.env['AMADEUS_CLIENT_ID'] ? { clientId: process.env['AMADEUS_CLIENT_ID'] } : {}),
        ...(process.env['AMADEUS_CLIENT_SECRET']
          ? { clientSecret: process.env['AMADEUS_CLIENT_SECRET'] }
          : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
