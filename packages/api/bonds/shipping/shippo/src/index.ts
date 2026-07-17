/**
 * Shippo shipping provider for molecule.dev.
 *
 * Implements the `@molecule/api-shipping` core interface against the
 * Shippo REST API (`https://api.goshippo.com`). Supports rate quotes,
 * label purchase via transactions, label refund (Shippo's equivalent of
 * void — Shippo does not support true voids), and tracking lookups
 * across the carriers Shippo supports (USPS, UPS, FedEx, DHL, etc.).
 *
 * @see https://docs.goshippo.com
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-shipping'
 * import { provider } from '@molecule/api-shipping-shippo'
 *
 * setProvider(provider)
 *
 * // Then anywhere in your app:
 * import { getRates, createLabel, trackPackage } from '@molecule/api-shipping'
 * const rates = await getRates({ from, to, parcels: [{ length, width, height, weight }] })
 * ```
 *
 * @remarks
 * Requires `SHIPPO_API_KEY` in the environment (test or live token).
 * Optionally `SHIPPO_API_URL` to override the base URL (sandbox / proxy).
 *
 * Shippo does **not** support voiding labels — `voidLabel()` issues a refund
 * request via `POST /refunds`. Refunds are subject to carrier-specific
 * rules and may be queued or rejected; a successful return only means the
 * refund was requested.
 *
 * **All parcels are quoted** — `shipment.parcels` is sent as a Shippo multi-piece
 * shipment (Shippo's `parcels` field is an array), so every parcel is included and
 * none are dropped. Carrier limits still apply (e.g. USPS does not support
 * multi-piece and the carrier returns the error; UPS allows up to 50).
 *
 * Parcel units: `Parcel.distanceUnit`/`massUnit` are honored per parcel and default
 * to `'in'`/`'lb'` when unspecified — metric parcels MUST set them or dimensions are
 * interpreted as inches/pounds.
 *
 * `createLabel(shipmentId, rate)` ignores `shipmentId` (Shippo buys by `rateId`
 * alone — pass any string); there is no separate quote-id to persist.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
