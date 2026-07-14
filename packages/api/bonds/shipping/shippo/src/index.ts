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
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
