/**
 * In-App Purchases interface for molecule.dev.
 *
 * Provides a unified API for in-app purchases that works across
 * different platforms (iOS App Store, Google Play, web Stripe).
 *
 * @example
 * ```ts
 * import {
 *   createNoopIAPProvider,
 *   finish,
 *   get,
 *   initialize,
 *   order,
 *   register,
 *   setProvider,
 *   verify,
 * } from '@molecule/app-iap'
 *
 * // Startup: bond a store provider (the no-op one is the only built-in — see remarks).
 * setProvider(createNoopIAPProvider())
 * await initialize()
 * register([{ id: 'com.example.pro_monthly', alias: 'pro_monthly', type: 'subscription' }])
 *
 * export async function buyPro(): Promise<{ ok: boolean; message?: string }> {
 *   const result = await order('pro_monthly')
 *   if (!result.success || !result.product) {
 *     return { ok: false, message: result.error?.message }
 *   }
 *   const { valid } = await verify(result.product, '/api/iap/verify')
 *   if (valid) finish(result.product) // only AFTER your server accepted the receipt
 *   return { ok: valid }
 * }
 *
 * get('pro_monthly')?.type // 'subscription'
 * await buyPro() // no-op provider: { ok: false, message: 'In-app purchases are not available.' }
 * ```
 *
 * @remarks
 * - NO store provider ships with the fleet yet: the only built-in
 *   implementation is `createNoopIAPProvider()`, and `getProvider()` silently
 *   self-bonds it when nothing is wired — so without a real provider
 *   `order()` ALWAYS fails with `E_NOT_AVAILABLE`, `verify()` returns
 *   `{ valid: false }`, and `isAvailable()` is `false`. To sell on iOS /
 *   Android, implement `IAPProvider` yourself (e.g. wrapping
 *   cordova-plugin-purchase, StoreKit 2, or Play Billing) and wire it with
 *   `setProvider()` at startup. Call `setProvider()` BEFORE `initialize()` /
 *   `register()` — each call goes to whichever provider is bonded at that moment,
 *   so products registered on an earlier provider are lost.
 * - `order()` never throws for store failures: check `result.success` and show
 *   `result.error.message` (already translated). `order()` / `get()` accept the
 *   store `id` OR the `alias` you registered.
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
