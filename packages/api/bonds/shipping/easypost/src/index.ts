/**
 * EasyPost shipping provider for molecule.dev.
 *
 * Implements the `@molecule/api-shipping` core interface against the
 * EasyPost REST API (`https://api.easypost.com/v2`). Supports rate quotes,
 * label purchase, label void/refund, and tracker creation across the
 * carriers EasyPost itself supports (USPS, UPS, FedEx, DHL, etc.).
 *
 * @see https://docs.easypost.com
 *
 * @example
 * ```typescript
 * import { createLabel, createShipment, setProvider } from '@molecule/api-shipping'
 * import { provider } from '@molecule/api-shipping-easypost'
 *
 * // Startup: bond once. Env: EASYPOST_API_KEY (EZTK… test key or EZAK… production key).
 * setProvider(provider)
 *
 * // Quote: ONE parcel per EasyPost shipment. Units default to inches + pounds.
 * const { shipmentId, rates } = await createShipment({
 *   from: {
 *     name: 'Acme Store',
 *     street1: '417 Montgomery St',
 *     city: 'San Francisco',
 *     state: 'CA',
 *     postalCode: '94104',
 *     country: 'US',
 *   },
 *   to: {
 *     name: 'Ada Lovelace',
 *     street1: '179 N Harbor Dr',
 *     city: 'Redondo Beach',
 *     state: 'CA',
 *     postalCode: '90277',
 *     country: 'US',
 *   },
 *   parcels: [{ length: 10, width: 8, height: 4, weight: 2, distanceUnit: 'in', massUnit: 'lb' }],
 * })
 *
 * // Rates are NOT sorted; amount is a decimal STRING — compare numerically.
 * const cheapest = [...rates].sort((a, b) => Number(a.amount.amount) - Number(b.amount.amount))[0]
 * if (!cheapest) throw new Error('No rates returned for this shipment')
 *
 * // Buy: pass the shipmentId from the SAME quote. Persist label.id to void (refund) later.
 * const label = await createLabel(shipmentId, cheapest)
 * // label.trackingNumber, label.labelUrl (PDF/PNG to print), label.amount
 * ```
 *
 * @remarks
 * - Requires `EASYPOST_API_KEY` in the environment (read per request — fail-fast
 *   error if unset). Optionally `EASYPOST_API_URL` to override the base URL
 *   (sandbox / proxy).
 * - **`createLabel(shipmentId, rate)` needs the EasyPost shipment id from the SAME
 *   quote.** Use the core `createShipment(shipment)` → `{ shipmentId, rates }` and
 *   persist BOTH between quote and purchase; plain `getRates()` discards the id.
 * - **One parcel per shipment.** An EasyPost shipment carries exactly one parcel
 *   (its API has a single `parcel` field, not an array), so passing
 *   `parcels.length > 1` THROWS rather than silently dropping the extras — send
 *   each parcel as its own shipment, or use `-shippo` for multi-piece shipments.
 * - **`Parcel.distanceUnit`/`massUnit` are honored.** Dimensions are converted to
 *   inches and weight to ounces (EasyPost's only accepted units — its Parcel
 *   object has no unit fields) before the call: `cm`→in, `lb`/`kg`/`g`→oz, so a
 *   metric parcel is priced correctly. Units default to `'in'`/`'lb'` when
 *   unspecified, matching the `-shippo` bond so a unit-less parcel is priced the
 *   same by either provider.
 * - `voidLabel(labelId)` refunds via `POST /shipments/:id/refund` — pass
 *   `ShippingLabel.id` (the EasyPost shipment id) returned by `createLabel`.
 * - **Rates come back in EasyPost's order, not cheapest-first**, and
 *   `MonetaryAmount.amount` is a decimal string (`'7.58'`) — never add/compare it as-is.
 * - **A test key (`EZTK…`) buys test labels only** (no charge, not shippable); switch to the
 *   production key for real postage.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
