/**
 * Pino logger provider for molecule.dev.
 *
 * Provides a high-performance logger implementation using pino.
 *
 * @see https://www.npmjs.com/package/pino
 *
 * @example
 * ```typescript
 * import { logger, setLogger } from '@molecule/api-logger'
 * import { createLogger, provider } from '@molecule/api-logger-pino'
 *
 * // Default: pretty in development, JSON in production
 * setLogger(provider)
 * logger.info('Server started on port', 3000)
 * logger.error('Database connection failed', error) // Error lands under `err` with its stack
 *
 * // Custom instance (name, transport, or an in-process destination) — level
 * // omitted, so this instance defers to the core's LOG_LEVEL/setLevel() gate
 * setLogger(createLogger({ name: 'api' }))
 * ```
 * @remarks
 * - Console-style variadic calls are bridged onto pino's `(object, message)`
 *   shape: `logger.info('msg', contextObj)` merges `contextObj` into the
 *   record, an `Error` anywhere serializes under `err` with its stack, and
 *   extra primitives are formatted into the message. Raw pino would DROP
 *   placeholder-less extra args and turn them into `{"0":…}` records.
 * - Both the default `provider` AND `createLogger()` (level omitted) pass
 *   every level through to pino — minimum-level filtering happens once, in
 *   `@molecule/api-logger` (`LOG_LEVEL` / `setLevel()`, default `'info'`).
 *   Passing an explicit `level` to `createLogger()` adds a SECOND, bond-side
 *   gate below the core's; a stricter level there makes the core's
 *   `setLevel('debug')` appear to do nothing — only do this if you actually
 *   want a second, independent filter on this specific instance.
 * - The default instance is created lazily on first log call (importing the
 *   package never spawns the pino-pretty worker thread).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pino.js'
export * from './provider.js'
export * from './types.js'
