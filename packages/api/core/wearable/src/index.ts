/**
 * Wearable core interface for molecule.dev (server-side).
 *
 * Defines a stack-neutral, provider-neutral contract for wearable
 * cloud-API bonds (Fitbit, Oura, Withings, Garmin, etc.) consumed by
 * handlers and background sync jobs. Wearable bonds register as a
 * **named multi-provider** — multiple wearable providers may be active
 * for a single user — so wiring uses the named bond API:
 * `bond('wearable', 'fitbit', provider)`.
 *
 * @example
 * ```typescript
 * import { setProvider, getProvider } from '@molecule/api-wearable'
 * import { createProvider as createFitbit } from '@molecule/api-wearable-fitbit'
 *
 * setProvider('fitbit', createFitbit({ credentialsStore, redirectUri: '...' }))
 *
 * const fitbit = getProvider('fitbit')
 * const today = await fitbit.getDailyActivity('user-1', '2026-05-01')
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
