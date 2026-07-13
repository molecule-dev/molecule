/**
 * Logger core interface for molecule.dev.
 *
 * Provides an abstract logging interface with a built-in console logger.
 * Use `setLogger` to swap in a provider like pino, winston, or loglevel.
 *
 * @example
 * ```typescript
 * import { logger, setLevel, setLogger, resetLogger } from '@molecule/api-logger'
 *
 * // Use the default console logger
 * logger.info('Server started on port', 3000)
 * logger.warn('Rate limit approaching')
 * logger.error('Database connection failed', error)
 *
 * // The minimum level defaults to 'info' — trace/debug are DROPPED until
 * // you lower the gate (or set LOG_LEVEL=debug in the environment):
 * setLevel('debug')
 * logger.debug('Request received', { method: 'GET', path: '/api' })
 *
 * // Set a custom logger provider
 * import { log } from '@molecule/api-logger-loglevel'
 * setLogger(log)
 *
 * // Reset to default console logger
 * resetLogger()
 * ```
 * @remarks
 * - **`logger.debug(...)`/`logger.trace(...)` print nothing by default.** The
 *   minimum level is `'info'` (from the `LOG_LEVEL` env var, falling back to
 *   `'info'` when unset/invalid). A "missing" debug line means the gate is
 *   filtering it — call `setLevel('debug')` or set `LOG_LEVEL=debug`; the
 *   logger is not broken.
 * - Filtering happens ONCE, here in the core, before the bonded provider is
 *   invoked. Provider bonds (pino/winston/loglevel) deliberately pass every
 *   level through, so this gate is the single knob — don't also configure a
 *   level in the bond unless you want a second, stricter gate.
 * - `setLevel('silent')` drops everything, including `logger.error(...)`.
 *
 * @module
 */

export * from './logger.js'
export * from './types.js'
