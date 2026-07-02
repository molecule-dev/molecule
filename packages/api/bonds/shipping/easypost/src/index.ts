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
 * Requires `EASYPOST_API_KEY` in the environment. Optionally
 * `EASYPOST_API_URL` to override the base URL (sandbox / proxy).
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
