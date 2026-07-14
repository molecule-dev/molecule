/**
 * Loglevel logger provider for molecule.dev.
 *
 * Provides a lightweight logger implementation using loglevel.
 *
 * @see https://www.npmjs.com/package/loglevel
 *
 * @example
 * ```typescript
 * import { logger, setLogger } from '@molecule/api-logger'
 * import { provider } from '@molecule/api-logger-loglevel'
 *
 * setLogger(provider)
 * logger.info('Server started on port', 3000)
 * ```
 * @remarks
 * - The provider passes every level through to loglevel — minimum-level
 *   filtering happens once, in `@molecule/api-logger` (`LOG_LEVEL` env var /
 *   `setLevel()`, default `'info'`). Raw loglevel's own default level is WARN,
 *   which would otherwise silently swallow `logger.info(...)` out of the box.
 * - Use this package's `setLevel()`/`createLogger({ level })` only when you
 *   want an ADDITIONAL bond-side gate below the core's — a stricter level here
 *   makes the core's `setLevel('debug')` appear to do nothing.
 * - `trace` delegates to `console.trace`, which prints a stack trace with
 *   every call (loglevel behavior, not a bug).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './logger.js'
export * from './provider.js'
export * from './types.js'
