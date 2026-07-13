/**
 * Winston logger provider for molecule.dev.
 *
 * Provides a full-featured logger implementation using winston.
 *
 * @see https://www.npmjs.com/package/winston
 *
 * @example
 * ```typescript
 * import { logger, setLogger } from '@molecule/api-logger'
 * import { createLogger, provider } from '@molecule/api-logger-winston'
 *
 * // Default: colorized console output
 * setLogger(provider)
 * logger.info('Server started on port', 3000)
 * logger.error('Database connection failed', error) // message + full stack
 *
 * // Custom instance: JSON to a file
 * setLogger(
 *   createLogger({
 *     format: 'json',
 *     transports: [{ type: 'file', options: { filename: 'app.log' } }],
 *   }),
 * )
 * ```
 * @remarks
 * - Console-style variadic calls are bridged onto winston's
 *   `(message, meta)` shape: `logger.info('msg', contextObj)` merges
 *   `contextObj` into the record, and an `Error` (alone or after a message)
 *   keeps its stack. Naively stringifying args would print `[object Object]`
 *   and drop stacks.
 * - The default `provider` instance passes every level through — minimum-level
 *   filtering happens once, in `@molecule/api-logger` (`LOG_LEVEL` /
 *   `setLevel()`, default `'info'`). `createLogger({ level })` adds a
 *   bond-side gate below the core's; a stricter level there makes the core's
 *   `setLevel('debug')` appear to do nothing. NOTE: omitting `level` in
 *   `createLogger` defaults the instance to `'info'` — itself such a gate;
 *   pass `level: 'trace'` when the core's gate should be the only filter.
 * - Transport types: `console`, `file`, `http`, and `stream`
 *   (`options.stream` = any writable — handy for tests and in-process sinks).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './winston.js'
