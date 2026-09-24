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
 * @example
 * ```typescript
 * import { createLabel, createShipment, setProvider } from '@molecule/api-shipping'
 * import { provider } from '@molecule/api-shipping-shippo'
 *
 * // Startup: bond once. Env: SHIPPO_API_KEY (shippo_test_… or shippo_live_… token).
 * setProvider(provider)
 *
 * // Quote. Units default to inches + pounds — set them explicitly for metric parcels.
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
 * // Buy (a PDF label). Persist label.id — it is the transaction id voidLabel() needs.
 * const label = await createLabel(shipmentId, cheapest)
 * // label.trackingNumber, label.labelUrl, label.amount
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
 * `createLabel(shipmentId, rate)` ignores `shipmentId` — Shippo's transaction API
 * buys by `rateId` alone. The id still comes from the core `createShipment(shipment)`
 * → `{ shipmentId, rates }` path (the same one EasyPost's buy endpoint requires), so
 * callers wire the flow identically regardless of the bonded provider.
 *
 * **Rates come back in Shippo's order, not cheapest-first**, and
 * `MonetaryAmount.amount` is a decimal string (`'7.58'`). `createLabel()` THROWS when the
 * Shippo transaction status is not `SUCCESS` (the carrier's messages are in the error) — a
 * resolved promise means a usable label. Labels are always PDF.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
