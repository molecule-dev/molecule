/**
 * Console logger provider for molecule.dev.
 *
 * @example
 * ```typescript
 * import { logger, setLevel, setLogger } from '@molecule/api-logger'
 * import { provider } from '@molecule/api-logger-console'
 *
 * // Startup: bond once. Log through the CORE `logger`, never `provider` directly.
 * setLogger(provider)
 *
 * logger.info('Server started', { port: 3000 }) // → console.info('Server started', { port: 3000 })
 * logger.debug('Cache warmed', { keys: 42 }) // DROPPED: the core's default level is 'info'
 *
 * setLevel('debug') // or LOG_LEVEL=debug in the environment
 * logger.debug('Request received', { method: 'GET', path: '/api/items' })
 *
 * try {
 *   JSON.parse('{not json')
 * } catch (error) {
 *   logger.error('Failed to parse webhook payload', { error }) // keep the error object (stack)
 * }
 * ```
 *
 * @remarks
 * - The provider passes every level straight to the matching `console`
 *   method — minimum-level filtering happens once, in `@molecule/api-logger`
 *   (`LOG_LEVEL` env var / `setLevel()`, default `'info'`). A "missing"
 *   `logger.debug(...)` line means the CORE's gate dropped it — lower the
 *   gate; the provider has no level configuration of its own.
 * - `trace` delegates to `console.trace`, which prints a stack trace with
 *   every call (console behavior, not a bug).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
