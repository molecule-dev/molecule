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
 * @module
 */

export * from './iap.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
