/**
 * Pino logger provider for molecule.dev.
 *
 * Provides a high-performance logger implementation using pino.
 *
 * @see https://www.npmjs.com/package/pino
 *
 * @example
 * ```typescript
 * import { logger, setLevel, setLogger } from '@molecule/api-logger'
 * import { createLogger } from '@molecule/api-logger-pino'
 *
 * // Startup: bond once. JSON lines to stdout (pretty in local dev). Leave `level` unset —
 * // the core's LOG_LEVEL / setLevel() gate is the single filter.
 * setLogger(createLogger({ name: 'api', pretty: process.env.NODE_ENV === 'development' }))
 *
 * // Log through the CORE `logger` everywhere.
 * logger.info('Server started', { port: 3000 })
 * // → {"level":30,"time":…,"name":"api","port":3000,"msg":"Server started"}
 * logger.debug('Cache warmed', { keys: 42 }) // DROPPED: the core's default level is 'info'
 *
 * setLevel('debug') // or LOG_LEVEL=debug
 * logger.debug('Request received', { method: 'GET', path: '/api/items' })
 *
 * try {
 *   JSON.parse('{not json')
 * } catch (error) {
 *   logger.error('Failed to parse webhook payload', { error }) // error.type/message/stack kept
 * }
 * ```
 *
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
 * - Pass the error INSIDE an object (`{ error }` or `{ err }`) or as an argument —
 *   both keys are serialized with `type`, `message` and `stack`; any other key
 *   holding an `Error` serializes to `{}`.
 * - The default `provider` pretty-prints whenever `NODE_ENV !== 'production'`
 *   (pino-pretty worker thread); use `createLogger()` to choose explicitly.
 *   `destination` (any `{ write(msg) }`) wins over `pretty`/`transport`.
 * - The default instance is created lazily on first log call (importing the
 *   package never spawns the pino-pretty worker thread).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pino.js'
export * from './provider.js'
export * from './types.js'
