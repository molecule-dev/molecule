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
 * // Custom instance (level, name, transport, or an in-process destination)
 * setLogger(createLogger({ level: 'trace', name: 'api' }))
 * ```
 * @remarks
 * - Console-style variadic calls are bridged onto pino's `(object, message)`
 *   shape: `logger.info('msg', contextObj)` merges `contextObj` into the
 *   record, an `Error` anywhere serializes under `err` with its stack, and
 *   extra primitives are formatted into the message. Raw pino would DROP
 *   placeholder-less extra args and turn them into `{"0":…}` records.
 * - The default `provider` instance passes every level through — minimum-level
 *   filtering happens once, in `@molecule/api-logger` (`LOG_LEVEL` /
 *   `setLevel()`, default `'info'`). `createLogger({ level })` adds a
 *   bond-side gate below the core's; a stricter level there makes the core's
 *   `setLevel('debug')` appear to do nothing. NOTE: omitting `level` in
 *   `createLogger` defaults the instance to `'info'` — itself such a gate;
 *   pass `level: 'trace'` when the core's gate should be the only filter.
 * - The default instance is created lazily on first log call (importing the
 *   package never spawns the pino-pretty worker thread).
 *
 * @module
 */

export * from './pino.js'
export * from './provider.js'
export * from './types.js'
