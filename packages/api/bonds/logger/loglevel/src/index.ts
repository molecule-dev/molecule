/**
 * Loglevel logger provider for molecule.dev.
 *
 * Provides a lightweight logger implementation using loglevel.
 *
 * @see https://www.npmjs.com/package/loglevel
 *
 * @example
 * ```typescript
 * import { logger, setLevel, setLogger } from '@molecule/api-logger'
 * import { provider } from '@molecule/api-logger-loglevel'
 *
 * // Startup: bond once. Log through the CORE `logger`, never `provider` directly.
 * setLogger(provider)
 *
 * logger.info('Server started', { port: 3000 }) // printed via loglevel → console.info
 * logger.debug('Cache warmed', { keys: 42 }) // DROPPED: the core's default level is 'info'
 *
 * setLevel('debug') // the CORE setLevel (or LOG_LEVEL=debug), not this package's
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
 * - The provider passes every level through to loglevel — minimum-level
 *   filtering happens once, in `@molecule/api-logger` (`LOG_LEVEL` env var /
 *   `setLevel()`, default `'info'`). Raw loglevel's own default level is WARN,
 *   which would otherwise silently swallow `logger.info(...)` out of the box.
 * - Use this package's `setLevel()`/`createLogger({ level })` only when you
 *   want an ADDITIONAL bond-side gate below the core's — a stricter level here
 *   makes the core's `setLevel('debug')` appear to do nothing.
 * - loglevel writes `debug` through `console.log` (not `console.debug`) and binds
 *   the console methods when a level is set — a console patched later (e.g. a
 *   test spy) is not seen until the level is set again.
 * - `trace` delegates to `console.trace`, which prints a stack trace with
 *   every call (loglevel behavior, not a bug).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './logger.js'
export * from './provider.js'
export * from './types.js'
