/**
 * Shipping core interface for molecule.dev.
 *
 * Defines the standard interface for shipping/carrier providers
 * (EasyPost, Shippo, etc.). Used for rate quotes, label generation,
 * label voiding, and package tracking.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, getRates, createLabel, trackPackage } from '@molecule/api-shipping'
 * import { provider } from '@molecule/api-shipping-easypost' // or '@molecule/api-shipping-shippo'
 *
 * // Bond a provider at startup
 * setProvider(provider)
 *
 * // 1. Quote rates — keep the returned ShippingRate objects intact (they carry rateId).
 * const rates = await getRates({
 *   from: { street1: '...', city: '...', postalCode: '...', country: 'US' },
 *   to: { street1: '...', city: '...', postalCode: '...', country: 'US' },
 *   parcels: [{ length: 10, width: 6, height: 4, weight: 2 }],
 * })
 *
 * // 2. Purchase a label for a QUOTED rate. The first argument is the provider-assigned
 * // shipment id from the SAME quote step (see @remarks — some bonds ignore it, others
 * // expose it via a bond-specific quote helper); the rate MUST be one returned by
 * // getRates — bonds reject a hand-built rate without rateId.
 * const label = await createLabel(shipmentId, rates[0])
 *
 * // 3. Track using values from the purchased label.
 * const status = await trackPackage(label.carrier, label.trackingNumber)
 * ```
 *
 * @remarks
 * - **`createLabel` consumes the EXACT rate object returned by `getRates`** — its `rateId`
 *   is the provider's purchase handle and every bond rejects a rate without it. Persist the
 *   chosen {@link ShippingRate} (not a reconstruction of carrier/service/amount) between the
 *   quote step and the purchase step.
 * - **The `shipmentId` argument is provider-assigned during the quote — the core API does
 *   not produce it.** Bonds whose purchase API only needs the rate ignore it (pass any
 *   string); bonds that require it expose a quote variant returning
 *   `{ shipmentId, rates }` — check the bonded provider's docs before wiring the purchase
 *   flow, and store the shipment id alongside the quoted rates.
 * - Label purchases cost real money outside the provider's TEST mode — use test API keys in
 *   development, and re-quote before purchase (rate quotes expire).
 * - Addresses and parcels are user input: validate server-side (`country` is ISO 3166-1
 *   alpha-2; set `distanceUnit`/`massUnit` explicitly rather than assuming defaults).
 * - {@link MonetaryAmount.amount} is a STRING to avoid float loss — never do arithmetic on
 *   it directly; display it or convert via a decimal-safe path.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './shipping.js'
export * from './types.js'
