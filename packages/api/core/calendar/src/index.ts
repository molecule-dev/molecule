/**
 * Calendar core interface for molecule.dev (server-side).
 *
 * Defines a stack-neutral contract for OAuth-backed calendar bonds (Google,
 * Microsoft, iCloud, etc.) consumed by handlers and background jobs. Bond a
 * provider at startup, then call the convenience wrappers from anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, listEvents } from '@molecule/api-calendar'
 * import { provider } from '@molecule/api-calendar-google'
 *
 * setProvider(provider)
 *
 * const { data, credentials } = await listEvents(
 *   userCreds,
 *   'primary',
 *   { timeMin: '2026-05-01T00:00:00Z', timeMax: '2026-05-08T00:00:00Z' },
 * )
 *
 * if (credentials) {
 *   await persistRefreshedCredentials(userId, credentials)
 * }
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
