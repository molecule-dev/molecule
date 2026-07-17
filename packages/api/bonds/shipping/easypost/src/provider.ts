/**
 * EasyPost shipping provider implementation.
 *
 * Wraps the EasyPost REST API via `fetch` and adapts request/response
 * shapes to the normalized `@molecule/api-shipping` core interface.
 * EasyPost-specific shapes never leak through the public API.
 *
 * @see https://docs.easypost.com/docs/addresses
 * @see https://docs.easypost.com/docs/shipments
 * @see https://docs.easypost.com/docs/trackers
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

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

const DEFAULT_API_URL = 'https://api.easypost.com/v2'

/**
 * Static list of carriers EasyPost supports out of the box. The full set is
 * enabled per-account via the EasyPost dashboard; this constant reflects the
 * common set advertised by EasyPost's product page, normalized to lowercase
 * carrier identifiers consistent with the rest of the bond.
 *
 * @see https://www.easypost.com/carriers
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
  'amazon_mws',
])

/**
 * EasyPost address payload. Internal — never returned to callers.
 */
interface EasyPostAddress {
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
 * EasyPost parcel payload. Internal — never returned to callers.
 */
interface EasyPostParcel {
  length: number
  width: number
  height: number
  weight: number
}

/**
 * EasyPost rate object as returned in `/shipments` responses. Internal.
 */
interface EasyPostRate {
  id: string
  carrier: string
  service: string
  rate: string
  currency: string
  delivery_days?: number | null
  delivery_date?: string | null
  delivery_date_guaranteed?: boolean | null
  est_delivery_days?: number | null
}

/**
 * EasyPost shipment object. Internal.
 */
interface EasyPostShipment {
  id: string
  rates: EasyPostRate[]
  selected_rate?: EasyPostRate | null
  postage_label?: { label_url?: string | null } | null
  tracking_code?: string | null
}

/**
 * EasyPost tracker object. Internal.
 */
interface EasyPostTracker {
  carrier: string
  tracking_code: string
  status?: string | null
  est_delivery_date?: string | null
  tracking_details?: Array<{
    datetime?: string | null
    status?: string | null
    message?: string | null
    tracking_location?: {
      city?: string | null
      state?: string | null
      country?: string | null
    } | null
  }> | null
}

/**
 * Sanitizes errors so an EasyPost API key (or `Authorization` header containing
 * one) cannot leak into logs or thrown errors. EasyPost keys begin with `EZAK`
 * (production) or `EZTK` (test) — we match those prefixes and any embedded
 * Basic-auth header.
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
    } catch (_error) {
      // JSON.stringify can throw for circular references or BigInt values;
      // String() is always safe and this is best-effort sanitization.
      text = String(input)
    }
  }
  return text
    .replace(/EZ[AT]K[A-Za-z0-9]+/g, '[redacted]')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic [redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}

/**
 * Lazily reads and validates the EasyPost API key.
 *
 * @returns The API key string.
 * @throws {Error} If `EASYPOST_API_KEY` is not set.
 */
const getApiKey = (): string => {
  const apiKey = process.env.EASYPOST_API_KEY
  if (!apiKey) {
    throw new Error('EASYPOST_API_KEY is not set. Shipping label and tracking calls will fail.')
  }
  return apiKey
}

/**
 * Returns the configured EasyPost API base URL.
 *
 * @returns Base URL with no trailing slash.
 */
const getApiUrl = (): string => {
  const raw = process.env.EASYPOST_API_URL || DEFAULT_API_URL
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

/**
 * Performs an authenticated request against the EasyPost REST API.
 *
 * @param path - API path beginning with `/`.
 * @param init - Optional fetch init (method, body, headers).
 * @returns Parsed JSON body typed as `T`.
 * @throws {Error} If the response is non-2xx, with the API key sanitized.
 */
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const apiKey = getApiKey()
  const url = `${getApiUrl()}${path}`
  const auth = Buffer.from(`${apiKey}:`).toString('base64')

  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
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
    logger.error('EasyPost network error:', safe)
    throw new Error(`EasyPost request failed: ${safe}`, { cause: error })
  }

  const text = await response.text()
  if (!response.ok) {
    const safe = sanitize(text || `HTTP ${response.status}`)
    logger.error('EasyPost API error:', response.status, safe)
    throw new Error(`EasyPost API error (${response.status}): ${safe}`)
  }

  if (!text) {
    return {} as T
  }
  try {
    return JSON.parse(text) as T
  } catch (error) {
    const safe = sanitize(error)
    throw new Error(`EasyPost returned invalid JSON: ${safe}`, { cause: error })
  }
}

/**
 * Maps a normalized address to EasyPost's address payload.
 *
 * @param address - Core shipping address.
 * @returns EasyPost address payload.
 */
const toEasyPostAddress = (address: ShippingAddress): EasyPostAddress => ({
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
 * Centimeters per inch — exact, by definition of the international inch.
 */
const CM_PER_IN = 2.54

/**
 * Ounces per pound — exact.
 */
const OZ_PER_LB = 16

/**
 * Grams per ounce. 1 oz ≡ 28.349523125 g exactly; rounded to 4 dp, which is far
 * finer than EasyPost's single-decimal storage so it loses nothing that affects
 * the rate. Using one gram→ounce constant keeps `g` and `kg` mutually
 * consistent (1 kg = 1000 g = 35.274 oz).
 */
const G_PER_OZ = 28.3495

/**
 * Rounds a converted measurement to 4 decimal places to strip IEEE-754 float
 * noise (e.g. `25.4 / 2.54` computes to `9.999999999999998`). EasyPost stores
 * dimensions and weights to a single decimal place, so 4 dp is well within its
 * precision and does not alter the quoted rate.
 *
 * @param value - Raw converted value.
 * @returns Value rounded to 4 decimal places.
 */
const round4 = (value: number): number => Math.round(value * 1e4) / 1e4

/**
 * Converts a linear dimension to inches — the only distance unit EasyPost's
 * Parcel object accepts (it has no `distance_unit` field).
 *
 * @param value - Dimension in `unit`.
 * @param unit - Source distance unit.
 * @returns Dimension in inches.
 * @throws {Error} If `unit` is not a supported distance unit.
 */
const toInches = (value: number, unit: 'in' | 'cm'): number => {
  switch (unit) {
    case 'in':
      return round4(value)
    case 'cm':
      return round4(value / CM_PER_IN)
    default:
      throw new Error(`Unsupported distanceUnit "${String(unit)}"; expected "in" or "cm".`)
  }
}

/**
 * Converts a weight to ounces — the only mass unit EasyPost's Parcel object
 * accepts (it has no `mass_unit` field). Never treat a metric weight as ounces:
 * that misprices the label the caller PAYS for.
 *
 * @param value - Weight in `unit`.
 * @param unit - Source mass unit.
 * @returns Weight in ounces.
 * @throws {Error} If `unit` is not a supported mass unit.
 */
const toOunces = (value: number, unit: 'lb' | 'oz' | 'kg' | 'g'): number => {
  switch (unit) {
    case 'oz':
      return round4(value)
    case 'lb':
      return round4(value * OZ_PER_LB)
    case 'g':
      return round4(value / G_PER_OZ)
    case 'kg':
      return round4((value * 1000) / G_PER_OZ)
    default:
      throw new Error(`Unsupported massUnit "${String(unit)}"; expected "lb", "oz", "kg", or "g".`)
  }
}

/**
 * Maps a normalized parcel to EasyPost's parcel payload, converting dimensions
 * to inches and weight to ounces — EasyPost's Parcel object has no unit fields
 * and is always interpreted as inches + ounces, so a `cm`/`kg`/`g`/`lb` parcel
 * MUST be converted or the carrier prices (and charges for) the wrong size.
 * `Parcel.distanceUnit`/`massUnit` default to `'in'`/`'lb'` when unspecified,
 * matching the `-shippo` bond so a unit-less parcel is priced identically by
 * either provider.
 *
 * @see https://docs.easypost.com/docs/parcels
 * @param parcel - Core parcel.
 * @returns EasyPost parcel payload in inches + ounces.
 */
const toEasyPostParcel = (parcel: Parcel): EasyPostParcel => {
  const distanceUnit = parcel.distanceUnit ?? 'in'
  const massUnit = parcel.massUnit ?? 'lb'
  return {
    length: toInches(parcel.length, distanceUnit),
    width: toInches(parcel.width, distanceUnit),
    height: toInches(parcel.height, distanceUnit),
    weight: toOunces(parcel.weight, massUnit),
  }
}

/**
 * Maps EasyPost's status string to the normalized core status code.
 *
 * @param status - EasyPost status, e.g. `pre_transit`, `in_transit`,
 *   `out_for_delivery`, `delivered`, `available_for_pickup`,
 *   `return_to_sender`, `failure`, `unknown`, etc.
 * @returns Normalized `TrackingStatusCode`.
 */
const toTrackingStatus = (status: string | null | undefined): TrackingStatusCode => {
  switch ((status ?? '').toLowerCase()) {
    case 'pre_transit':
      return 'pre_transit'
    case 'in_transit':
      return 'in_transit'
    case 'out_for_delivery':
      return 'out_for_delivery'
    case 'delivered':
      return 'delivered'
    case 'available_for_pickup':
      return 'available_for_pickup'
    case 'return_to_sender':
      return 'return_to_sender'
    case 'failure':
    case 'cancelled':
    case 'error':
      return 'failure'
    default:
      return 'unknown'
  }
}

/**
 * Maps an EasyPost rate to the normalized `ShippingRate`.
 *
 * @param rate - EasyPost rate payload.
 * @returns Normalized rate.
 */
const toShippingRate = (rate: EasyPostRate): ShippingRate => {
  const amount: MonetaryAmount = {
    amount: rate.rate,
    currency: rate.currency,
  }

  let deliveryEstimate: DeliveryEstimate | undefined
  const businessDays = rate.delivery_days ?? rate.est_delivery_days ?? undefined
  const latest = rate.delivery_date ? new Date(rate.delivery_date) : undefined
  if (businessDays !== undefined || latest !== undefined) {
    deliveryEstimate = {
      businessDays: businessDays ?? undefined,
      latest,
    }
  }

  return {
    carrier: rate.carrier.toLowerCase(),
    service: rate.service,
    amount,
    deliveryEstimate,
    rateId: rate.id,
  }
}

/**
 * Maps an EasyPost tracker payload to the normalized `TrackingStatus`.
 *
 * @param tracker - EasyPost tracker payload.
 * @returns Normalized tracking status.
 */
const toTrackingStatusValue = (tracker: EasyPostTracker): TrackingStatus => {
  const events: TrackingEvent[] = (tracker.tracking_details ?? []).map((detail) => {
    const locationParts: string[] = []
    if (detail.tracking_location?.city) {
      locationParts.push(detail.tracking_location.city)
    }
    if (detail.tracking_location?.state) {
      locationParts.push(detail.tracking_location.state)
    }
    if (detail.tracking_location?.country) {
      locationParts.push(detail.tracking_location.country)
    }
    return {
      timestamp: detail.datetime ? new Date(detail.datetime) : new Date(0),
      status: toTrackingStatus(detail.status),
      description: detail.message ?? '',
      location: locationParts.length > 0 ? locationParts.join(', ') : undefined,
    }
  })

  let estimatedDelivery: DeliveryEstimate | undefined
  if (tracker.est_delivery_date) {
    estimatedDelivery = { latest: new Date(tracker.est_delivery_date) }
  }

  return {
    carrier: tracker.carrier.toLowerCase(),
    trackingNumber: tracker.tracking_code,
    status: toTrackingStatus(tracker.status),
    events,
    estimatedDelivery,
  }
}

/**
 * Lists the carriers supported by this EasyPost bond.
 *
 * @returns Lowercase carrier identifiers.
 */
export const listSupportedCarriers = async (): Promise<string[]> => {
  return [...SUPPORTED_CARRIERS]
}

/**
 * Requests rate quotes for a shipment. Creates an EasyPost shipment via
 * `POST /shipments` and normalizes the returned rates. The EasyPost
 * shipment `id` is required to subsequently buy a label — callers
 * should preserve it from `getRatesDetailed` (or supply their own
 * shipment ID via the underlying API) when calling {@link createLabel}.
 *
 * @param shipment - Normalized shipment payload.
 * @returns Array of normalized shipping rates.
 * @throws {Error} If the shipment contains no parcels, or more than one (an
 *   EasyPost shipment accepts exactly one parcel — this bond never silently
 *   drops the extras).
 */
export const getRates = async (shipment: Shipment): Promise<ShippingRate[]> => {
  const detailed = await getRatesDetailed(shipment)
  return detailed.rates
}

/**
 * Like {@link getRates}, but additionally returns the EasyPost shipment
 * ID needed to purchase a label via {@link createLabel}. EasyPost-specific
 * — call this when you need both pieces in one round-trip.
 *
 * @param shipment - Normalized shipment payload.
 * @returns Object with `shipmentId` (EasyPost shipment ID) and `rates`.
 * @throws {Error} If the shipment contains no parcels, or more than one. An
 *   EasyPost shipment carries exactly one parcel (its API has a single `parcel`
 *   field, not an array), so rather than silently drop `parcels[1..n]` — cargo
 *   the caller intends to pay to ship — this throws. Send each parcel as its own
 *   shipment, or use `@molecule/api-shipping-shippo`, which quotes multi-piece
 *   shipments.
 */
export const getRatesDetailed = async (
  shipment: Shipment,
): Promise<{ shipmentId: string; rates: ShippingRate[] }> => {
  if (shipment.parcels.length === 0) {
    throw new Error('getRates requires at least one parcel.')
  }
  if (shipment.parcels.length > 1) {
    throw new Error(
      `@molecule/api-shipping-easypost supports a single parcel per shipment; got ` +
        `${shipment.parcels.length}. An EasyPost shipment accepts exactly one parcel — ` +
        `send each parcel as its own shipment, or use @molecule/api-shipping-shippo, ` +
        `which quotes multi-piece shipments.`,
    )
  }
  const body = {
    shipment: {
      to_address: toEasyPostAddress(shipment.to),
      from_address: toEasyPostAddress(shipment.from),
      parcel: toEasyPostParcel(shipment.parcels[0]!),
    },
  }
  const result = await request<EasyPostShipment>('/shipments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return {
    shipmentId: result.id,
    rates: result.rates.map(toShippingRate),
  }
}

/**
 * Purchases a shipping label for a previously-quoted rate.
 *
 * @param shipmentId - EasyPost shipment ID returned from a prior
 *   `/shipments` call.
 * @param rate - The rate selected for purchase. Must include `rateId`.
 * @returns The purchased label normalized to `ShippingLabel`.
 * @throws {Error} If `rate.rateId` is missing or the API call fails.
 */
export const createLabel = async (
  shipmentId: string,
  rate: ShippingRate,
): Promise<ShippingLabel> => {
  if (!rate.rateId) {
    throw new Error('createLabel requires rate.rateId from a prior getRates() call.')
  }
  const result = await request<EasyPostShipment>(`/shipments/${shipmentId}/buy`, {
    method: 'POST',
    body: JSON.stringify({ rate: { id: rate.rateId } }),
  })

  const trackingNumber = result.tracking_code ?? ''
  const labelUrl = result.postage_label?.label_url ?? ''
  const selected = result.selected_rate ?? undefined
  const carrier = (selected?.carrier ?? rate.carrier).toLowerCase()
  const service = selected?.service ?? rate.service
  const amount: MonetaryAmount | undefined = selected
    ? { amount: selected.rate, currency: selected.currency }
    : rate.amount

  return {
    id: result.id,
    trackingNumber,
    labelUrl,
    carrier,
    service,
    amount,
  }
}

/**
 * Voids (refunds) a previously purchased label. EasyPost handles void
 * via `POST /shipments/:id/refund`.
 *
 * @param labelId - EasyPost shipment ID associated with the label.
 */
export const voidLabel = async (labelId: string): Promise<void> => {
  await request<unknown>(`/shipments/${labelId}/refund`, { method: 'POST' })
}

/**
 * Retrieves the current tracking status for a package. Creates a tracker
 * via `POST /trackers` (idempotent — EasyPost reuses an existing tracker
 * for the same carrier + tracking code) and normalizes the response.
 *
 * @param carrier - Carrier identifier (e.g., `usps`, `ups`).
 * @param trackingNumber - Carrier-assigned tracking number.
 * @returns Normalized tracking status.
 */
export const trackPackage = async (
  carrier: string,
  trackingNumber: string,
): Promise<TrackingStatus> => {
  const result = await request<EasyPostTracker>('/trackers', {
    method: 'POST',
    body: JSON.stringify({
      tracker: { carrier, tracking_code: trackingNumber },
    }),
  })
  return toTrackingStatusValue(result)
}

/**
 * The EasyPost shipping provider implementing the `ShippingProvider` interface.
 */
export const provider: ShippingProvider = {
  listSupportedCarriers,
  getRates,
  createLabel,
  voidLabel,
  trackPackage,
}
