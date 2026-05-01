/**
 * Shippo shipping provider implementation.
 *
 * Wraps the Shippo REST API via `fetch` and adapts request/response
 * shapes to the normalized `@molecule/api-shipping` core interface.
 * Shippo-specific shapes never leak through the public API.
 *
 * @see https://docs.goshippo.com/shippoapi/public-api/#tag/Shipments
 * @see https://docs.goshippo.com/shippoapi/public-api/#tag/Transactions
 * @see https://docs.goshippo.com/shippoapi/public-api/#tag/Tracks
 * @see https://docs.goshippo.com/shippoapi/public-api/#tag/Refunds
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  DeliveryEstimate,
  MonetaryAmount,
  Parcel,
  Shipment,
  ShippingAddress,
  ShippingLabel,
  ShippingProvider,
  ShippingRate,
  TrackingEvent,
  TrackingStatus,
  TrackingStatusCode,
} from '@molecule/api-shipping'

const logger = getLogger()

const DEFAULT_API_URL = 'https://api.goshippo.com'

/**
 * Static list of carriers Shippo supports out of the box. The full list of
 * supported carrier accounts is configured per-account via the Shippo
 * dashboard; this constant reflects the common set advertised by Shippo's
 * carriers page, normalized to lowercase carrier identifiers consistent with
 * the rest of the bond.
 *
 * @see https://goshippo.com/carriers
 */
const SUPPORTED_CARRIERS: ReadonlyArray<string> = Object.freeze([
  'usps',
  'ups',
  'fedex',
  'dhl_express',
  'dhl_ecommerce',
  'canada_post',
  'royal_mail',
  'australia_post',
  'aramex',
  'on_trac',
  'lasership',
  'purolator',
])

/**
 * Shippo address payload. Internal — never returned to callers.
 */
interface ShippoAddress {
  name?: string
  company?: string
  street1: string
  street2?: string
  city: string
  state?: string
  zip: string
  country: string
  phone?: string
  email?: string
}

/**
 * Shippo parcel payload. Internal — never returned to callers.
 */
interface ShippoParcel {
  length: string
  width: string
  height: string
  distance_unit: string
  weight: string
  mass_unit: string
}

/**
 * Shippo rate object. Internal.
 */
interface ShippoRate {
  object_id: string
  provider: string
  servicelevel?: { name?: string | null; token?: string | null } | null
  amount: string
  currency: string
  estimated_days?: number | null
  duration_terms?: string | null
}

/**
 * Shippo shipment object. Internal.
 */
interface ShippoShipment {
  object_id: string
  rates: ShippoRate[]
}

/**
 * Shippo transaction object (label purchase). Internal.
 */
interface ShippoTransaction {
  object_id: string
  status?: string | null
  tracking_number?: string | null
  label_url?: string | null
  rate?: string | null
  messages?: Array<{ text?: string | null; code?: string | null }> | null
}

/**
 * Shippo tracking-status entry. Internal.
 */
interface ShippoTrackingStatus {
  status?: string | null
  status_details?: string | null
  status_date?: string | null
  location?: {
    city?: string | null
    state?: string | null
    country?: string | null
    zip?: string | null
  } | null
}

/**
 * Shippo track payload from `GET /tracks/:carrier/:tracking_number`. Internal.
 */
interface ShippoTrack {
  carrier?: string | null
  tracking_number?: string | null
  tracking_status?: ShippoTrackingStatus | null
  tracking_history?: ShippoTrackingStatus[] | null
  eta?: string | null
}

/**
 * Sanitizes errors so a Shippo API token (or `Authorization` header containing
 * one) cannot leak into logs or thrown errors. Shippo tokens come in two
 * forms — `shippo_test_<hex>` and `shippo_live_<hex>` — and are presented
 * with the `ShippoToken` auth scheme.
 *
 * @param input - Arbitrary error-ish value or string.
 * @returns A safe-to-log string.
 */
const sanitize = (input: unknown): string => {
  let text: string
  if (input instanceof Error) {
    text = input.message
  } else if (typeof input === 'string') {
    text = input
  } else {
    try {
      text = JSON.stringify(input)
    } catch {
      text = String(input)
    }
  }
  return text
    .replace(/shippo_(?:test|live)_[A-Za-z0-9]+/gi, '[redacted]')
    .replace(/ShippoToken\s+[A-Za-z0-9_-]+/gi, 'ShippoToken [redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}

/**
 * Lazily reads and validates the Shippo API key.
 *
 * @returns The API key string.
 * @throws {Error} If `SHIPPO_API_KEY` is not set.
 */
const getApiKey = (): string => {
  const apiKey = process.env.SHIPPO_API_KEY
  if (!apiKey) {
    throw new Error('SHIPPO_API_KEY is not set. Shipping label and tracking calls will fail.')
  }
  return apiKey
}

/**
 * Returns the configured Shippo API base URL.
 *
 * @returns Base URL with no trailing slash.
 */
const getApiUrl = (): string => {
  const raw = process.env.SHIPPO_API_URL || DEFAULT_API_URL
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

/**
 * Performs an authenticated request against the Shippo REST API.
 *
 * @param path - API path beginning with `/`.
 * @param init - Optional fetch init (method, body, headers).
 * @returns Parsed JSON body typed as `T`.
 * @throws {Error} If the response is non-2xx, with the API token sanitized.
 */
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const apiKey = getApiKey()
  const url = `${getApiUrl()}${path}`

  const headers: Record<string, string> = {
    Authorization: `ShippoToken ${apiKey}`,
    Accept: 'application/json',
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  }
  if (init.body !== undefined && headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json'
  }

  let response: Response
  try {
    response = await fetch(url, { ...init, headers })
  } catch (error) {
    const safe = sanitize(error)
    logger.error('Shippo network error:', safe)
    throw new Error(`Shippo request failed: ${safe}`, { cause: error })
  }

  const text = await response.text()
  if (!response.ok) {
    const safe = sanitize(text || `HTTP ${response.status}`)
    logger.error('Shippo API error:', response.status, safe)
    throw new Error(`Shippo API error (${response.status}): ${safe}`)
  }

  if (!text) {
    return {} as T
  }
  try {
    return JSON.parse(text) as T
  } catch (error) {
    const safe = sanitize(error)
    throw new Error(`Shippo returned invalid JSON: ${safe}`, { cause: error })
  }
}

/**
 * Maps a normalized address to Shippo's address payload.
 *
 * @param address - Core shipping address.
 * @returns Shippo address payload.
 */
const toShippoAddress = (address: ShippingAddress): ShippoAddress => ({
  name: address.name,
  company: address.company,
  street1: address.street1,
  street2: address.street2,
  city: address.city,
  state: address.state,
  zip: address.postalCode,
  country: address.country,
  phone: address.phone,
  email: address.email,
})

/**
 * Maps a normalized parcel to Shippo's parcel payload. Shippo requires
 * dimension and mass units to be specified; we default to `in`/`lb` when
 * unspecified, matching the units most commonly used with US-based Shippo
 * accounts.
 *
 * @param parcel - Core parcel.
 * @returns Shippo parcel payload.
 */
const toShippoParcel = (parcel: Parcel): ShippoParcel => ({
  length: String(parcel.length),
  width: String(parcel.width),
  height: String(parcel.height),
  distance_unit: parcel.distanceUnit ?? 'in',
  weight: String(parcel.weight),
  mass_unit: parcel.massUnit ?? 'lb',
})

/**
 * Maps Shippo's status string to the normalized core status code.
 *
 * Shippo's tracking statuses (`PRE_TRANSIT`, `TRANSIT`, `DELIVERED`,
 * `RETURNED`, `FAILURE`, `UNKNOWN`) come from the Tracks API. Transaction
 * statuses (`SUCCESS`, `ERROR`, etc.) are *not* tracking statuses and are
 * not mapped here.
 *
 * @param status - Shippo tracking status, e.g. `TRANSIT`, `DELIVERED`.
 * @returns Normalized `TrackingStatusCode`.
 */
const toTrackingStatus = (status: string | null | undefined): TrackingStatusCode => {
  switch ((status ?? '').toUpperCase()) {
    case 'PRE_TRANSIT':
      return 'pre_transit'
    case 'TRANSIT':
      return 'in_transit'
    case 'OUT_FOR_DELIVERY':
      return 'out_for_delivery'
    case 'DELIVERED':
      return 'delivered'
    case 'AVAILABLE_FOR_PICKUP':
      return 'available_for_pickup'
    case 'RETURNED':
      return 'return_to_sender'
    case 'FAILURE':
    case 'CANCELLED':
    case 'ERROR':
      return 'failure'
    default:
      return 'unknown'
  }
}

/**
 * Maps a Shippo rate to the normalized `ShippingRate`. Shippo's `provider`
 * field carries the carrier name (e.g., `USPS`); we lowercase it to keep
 * carrier identifiers consistent with other bonds.
 *
 * @param rate - Shippo rate payload.
 * @returns Normalized rate.
 */
const toShippingRate = (rate: ShippoRate): ShippingRate => {
  const amount: MonetaryAmount = {
    amount: rate.amount,
    currency: rate.currency,
  }

  let deliveryEstimate: DeliveryEstimate | undefined
  if (rate.estimated_days !== undefined && rate.estimated_days !== null) {
    deliveryEstimate = { businessDays: rate.estimated_days }
  }

  const service = rate.servicelevel?.name ?? rate.servicelevel?.token ?? ''

  return {
    carrier: rate.provider.toLowerCase(),
    service,
    amount,
    deliveryEstimate,
    rateId: rate.object_id,
  }
}

/**
 * Builds a single normalized `TrackingEvent` from a Shippo tracking history
 * entry.
 *
 * @param entry - Shippo tracking-status entry.
 * @returns Normalized event.
 */
const toTrackingEvent = (entry: ShippoTrackingStatus): TrackingEvent => {
  const locationParts: string[] = []
  if (entry.location?.city) {
    locationParts.push(entry.location.city)
  }
  if (entry.location?.state) {
    locationParts.push(entry.location.state)
  }
  if (entry.location?.country) {
    locationParts.push(entry.location.country)
  }
  return {
    timestamp: entry.status_date ? new Date(entry.status_date) : new Date(0),
    status: toTrackingStatus(entry.status),
    description: entry.status_details ?? '',
    location: locationParts.length > 0 ? locationParts.join(', ') : undefined,
  }
}

/**
 * Maps a Shippo track payload to the normalized `TrackingStatus`.
 *
 * @param track - Shippo track payload.
 * @returns Normalized tracking status.
 */
const toTrackingStatusValue = (track: ShippoTrack): TrackingStatus => {
  const events: TrackingEvent[] = (track.tracking_history ?? []).map(toTrackingEvent)

  let estimatedDelivery: DeliveryEstimate | undefined
  if (track.eta) {
    estimatedDelivery = { latest: new Date(track.eta) }
  }

  return {
    carrier: (track.carrier ?? '').toLowerCase(),
    trackingNumber: track.tracking_number ?? '',
    status: toTrackingStatus(track.tracking_status?.status),
    events,
    estimatedDelivery,
  }
}

/**
 * Lists the carriers supported by this Shippo bond.
 *
 * @returns Lowercase carrier identifiers.
 */
export const listSupportedCarriers = async (): Promise<string[]> => {
  return [...SUPPORTED_CARRIERS]
}

/**
 * Requests rate quotes for a shipment. Creates a Shippo shipment via
 * `POST /shipments` and normalizes the returned rates.
 *
 * Shippo embeds rates inline in the shipment response — there is no
 * separate "fetch rates" call. Each rate's `object_id` becomes the
 * `rateId` consumed by {@link createLabel}.
 *
 * @param shipment - Normalized shipment payload.
 * @returns Array of normalized shipping rates.
 * @throws {Error} If the shipment contains no parcels.
 */
export const getRates = async (shipment: Shipment): Promise<ShippingRate[]> => {
  if (shipment.parcels.length === 0) {
    throw new Error('getRates requires at least one parcel.')
  }
  const body = {
    address_from: toShippoAddress(shipment.from),
    address_to: toShippoAddress(shipment.to),
    parcels: [toShippoParcel(shipment.parcels[0]!)],
    async: false,
  }
  const result = await request<ShippoShipment>('/shipments/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return (result.rates ?? []).map(toShippingRate)
}

/**
 * Purchases a shipping label for a previously-quoted rate.
 *
 * Shippo buys labels via `POST /transactions` referencing the rate's
 * `object_id` directly — there is no per-shipment "buy" endpoint. The
 * `shipmentId` argument is accepted to satisfy the
 * `ShippingProvider` interface but is not used by Shippo.
 *
 * @param shipmentId - Shipment identifier (ignored by Shippo; rate ID is sufficient).
 * @param rate - The rate selected for purchase. Must include `rateId`.
 * @returns The purchased label normalized to `ShippingLabel`.
 * @throws {Error} If `rate.rateId` is missing or the API call fails or the
 *   transaction status is not `SUCCESS`.
 */
export const createLabel = async (
  _shipmentId: string,
  rate: ShippingRate,
): Promise<ShippingLabel> => {
  if (!rate.rateId) {
    throw new Error('createLabel requires rate.rateId from a prior getRates() call.')
  }
  const result = await request<ShippoTransaction>('/transactions/', {
    method: 'POST',
    body: JSON.stringify({
      rate: rate.rateId,
      label_file_type: 'PDF',
      async: false,
    }),
  })

  if (result.status && result.status.toUpperCase() !== 'SUCCESS') {
    const messages = (result.messages ?? [])
      .map((m) => m.text)
      .filter((m): m is string => typeof m === 'string' && m.length > 0)
      .join('; ')
    const detail = messages.length > 0 ? messages : (result.status ?? 'unknown error')
    throw new Error(`Shippo transaction failed: ${sanitize(detail)}`)
  }

  return {
    id: result.object_id,
    trackingNumber: result.tracking_number ?? '',
    labelUrl: result.label_url ?? '',
    carrier: rate.carrier.toLowerCase(),
    service: rate.service,
    amount: rate.amount,
  }
}

/**
 * Refunds a previously purchased label.
 *
 * Shippo does **not** support voiding labels — the equivalent operation is
 * a refund request, which Shippo evaluates against carrier rules and may
 * approve, queue, or reject. This method calls
 * `POST /refunds` with the transaction `object_id`. Successful return
 * means the refund was *requested*, not necessarily granted.
 *
 * @param labelId - Shippo transaction `object_id` returned by
 *   {@link createLabel} as `ShippingLabel.id`.
 */
export const voidLabel = async (labelId: string): Promise<void> => {
  await request<unknown>('/refunds/', {
    method: 'POST',
    body: JSON.stringify({ transaction: labelId, async: false }),
  })
}

/**
 * Retrieves the current tracking status for a package via
 * `GET /tracks/:carrier/:tracking_number` and normalizes the response.
 *
 * @param carrier - Carrier identifier (e.g., `usps`, `ups`).
 * @param trackingNumber - Carrier-assigned tracking number.
 * @returns Normalized tracking status.
 */
export const trackPackage = async (
  carrier: string,
  trackingNumber: string,
): Promise<TrackingStatus> => {
  const encodedCarrier = encodeURIComponent(carrier.toLowerCase())
  const encodedTracking = encodeURIComponent(trackingNumber)
  const result = await request<ShippoTrack>(`/tracks/${encodedCarrier}/${encodedTracking}`)
  return toTrackingStatusValue(result)
}

/**
 * The Shippo shipping provider implementing the `ShippingProvider` interface.
 */
export const provider: ShippingProvider = {
  listSupportedCarriers,
  getRates,
  createLabel,
  voidLabel,
  trackPackage,
}
