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
 * - **Only the FIRST parcel is used.** `shipment.parcels[1..n]` are silently ignored
 *   — quote/purchase multi-parcel shipments one parcel per call.
 * - **Dimensions are sent as inches and weight as OUNCES, always.**
 *   `Parcel.distanceUnit`/`massUnit` are ignored by this bond — convert cm/kg/lb/g
 *   to inches/ounces yourself before calling, or the quote (and the label you PAY
 *   for) is priced for the wrong size. (The `-shippo` bond honors the unit fields.)
 * - `voidLabel(labelId)` refunds via `POST /shipments/:id/refund` — pass
 *   `ShippingLabel.id` (the EasyPost shipment id) returned by `createLabel`.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
