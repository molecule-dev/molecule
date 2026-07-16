/**
 * Daily.co video rooms provider for molecule.dev.
 *
 * Implements the `@molecule/api-video-rooms` interface using the Daily.co
 * REST API.
 *
 * @remarks
 * `createProvider()` throws at bond time when no API key is available
 * (config.apiKey or DAILY_CO_API_KEY) — an app wiring
 * `setProvider(createProvider())` at startup will not boot until the key is
 * set. `recording: true` maps to Daily.co cloud recording
 * (`enable_recording: 'cloud'`), which must be enabled on your Daily.co plan.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-video-rooms'
 * import { createProvider } from '@molecule/api-video-rooms-daily-co'
 *
 * // Bond at startup (reads DAILY_CO_API_KEY by default)
 * setProvider(createProvider())
 *
 * // Or with explicit config
 * setProvider(createProvider({ apiKey: 'd0c...' }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
