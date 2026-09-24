/**
 * Logger core interface for molecule.dev.
 *
 * Provides an abstract logging interface with a built-in console logger.
 * Use `setLogger` to swap in a provider like pino, winston, or loglevel.
 *
 * @example
 * ```typescript
 * import { logger, setLevel, setLogger } from '@molecule/api-logger'
 * import { createLogger } from '@molecule/api-logger-pino'
 *
 * // Startup: bond a provider (JSON lines to stdout). Leave `level` unset — the core's
 * // LOG_LEVEL / setLevel() gate is the single filter. (No bond = built-in console logger.)
 * setLogger(createLogger({ name: 'api' }))
 *
 * logger.info('Server started', { port: 3000 })
 * logger.debug('Cache warmed', { keys: 42 }) // DROPPED: the default minimum level is 'info'
 *
 * setLevel('debug') // or LOG_LEVEL=debug in the environment
 * logger.debug('Request received', { method: 'GET', path: '/api/items' })
 *
 * // Errors: say what failed and pass the error itself so the stack is kept.
 * try {
 *   JSON.parse('{not json')
 * } catch (error) {
 *   logger.error('Failed to parse webhook payload', { error })
 * }
 * ```
 *
 * @remarks
 * - **`logger.debug(...)`/`logger.trace(...)` print nothing by default.** The
 *   minimum level is `'info'` (from the `LOG_LEVEL` env var, falling back to
 *   `'info'` when unset/invalid). A "missing" debug line means the gate is
 *   filtering it — call `setLevel('debug')` or set `LOG_LEVEL=debug`; the
 *   logger is not broken.
 * - **`LOG_LEVEL` is read lazily, on the first call that needs the level**
 *   (`logger.*`/`getLevel()`), not at module-import time — and the result is
 *   then cached until `setLevel()` overrides it. This means an app that loads
 *   `dotenv`/`.env` AFTER its first transitive import of this module still
 *   sees `LOG_LEVEL`, as long as env loading finishes before the first log
 *   call (true in virtually every app — real logging starts after startup
 *   config, not during module evaluation).
 * - Filtering happens ONCE, here in the core, before the bonded provider is
 *   invoked. Provider bonds (pino/winston/loglevel) deliberately pass every
 *   level through, so this gate is the single knob — don't also configure a
 *   level in the bond unless you want a second, stricter gate.
 * - Log caught errors as `logger.error('what failed', { error })` — pass the
 *   error object itself (the pino bond serializes `error`/`err` keys with their
 *   stack); `String(error)` or `error.message` alone loses the stack.
 * - `setLevel('silent')` drops everything, including `logger.error(...)`.
 * - **`hasLogger()` reflects the bond registry**, not just `setLogger()`
 *   calls: it also returns `true` after `bond('logger', provider)` wired a
 *   provider directly (the path every bond package's `getLogger()` uses).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './logger.js'
export * from './types.js'
