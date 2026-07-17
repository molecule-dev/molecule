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
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-shipping'
 * import { provider } from '@molecule/api-shipping-easypost'
 *
 * setProvider(provider)
 *
 * // Then anywhere in your app:
 * import { getRates, createLabel, trackPackage } from '@molecule/api-shipping'
 * const rates = await getRates({ from, to, parcels: [{ length, width, height, weight }] })
 * ```
 *
 * @remarks
 * - Requires `EASYPOST_API_KEY` in the environment (read per request — fail-fast
 *   error if unset). Optionally `EASYPOST_API_URL` to override the base URL
 *   (sandbox / proxy).
 * - **`createLabel(shipmentId, rate)` needs the EasyPost shipment id from the SAME
 *   quote.** Use this bond's `getRatesDetailed(shipment)` → `{ shipmentId, rates }`
 *   and persist BOTH between quote and purchase; plain `getRates()` discards the id.
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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
