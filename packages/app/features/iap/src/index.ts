/**
 * In-App Purchases interface for molecule.dev.
 *
 * Provides a unified API for in-app purchases that works across
 * different platforms (iOS App Store, Google Play, web Stripe).
 *
 * @example
 * ```tsx
 * import { createNoopIAPProvider, initialize, order, finish,
 *   register, refresh, setProvider, verify } from '@molecule/app-iap'
 *
 * // Wire the provider at app startup (swap for an iOS/Android bond in production)
 * setProvider(createNoopIAPProvider())
 * await initialize()
 * register([{ id: 'com.example.pro_monthly', alias: 'pro_monthly', type: 'subscription' }])
 * await refresh()
 *
 * const result = await order('pro_monthly')
 * if (result.success && result.product) {
 *   await verify(result.product, '/api/iap/verify')
 *   finish(result.product)
 * }
 * ```
 * @remarks
 * - NO store provider ships with the fleet yet: the only built-in
 *   implementation is `createNoopIAPProvider()`, and `getProvider()` silently
 *   self-bonds it when nothing is wired — so without a real provider
 *   `order()` ALWAYS fails with `E_NOT_AVAILABLE`, `verify()` returns
 *   `{ valid: false }`, and `isAvailable()` is `false`. To sell on iOS /
 *   Android, implement `IAPProvider` yourself (e.g. wrapping
 *   cordova-plugin-purchase, StoreKit 2, or Play Billing) and wire it with
 *   `setProvider()` at startup.
 * - `verify()` POSTs the purchase to YOUR server: implement the endpoint with
 *   `@molecule/api-payments-apple` / `@molecule/api-payments-google` (receipt
 *   validation) and call `finish()` only after the server says the receipt is
 *   valid — finishing first loses the purchase if validation fails.
 * - Error messages route through `t('iap.error.*')` with English fallbacks;
 *   the `@molecule/app-locales-iap` bond supplies 79 translations.
 *
 * @module
 */

export * from './iap.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
