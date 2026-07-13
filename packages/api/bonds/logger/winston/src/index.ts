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
 * // Custom instance: JSON to a file — level omitted, so this instance defers
 * // to the core's LOG_LEVEL/setLevel() gate
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
 * - Both the default `provider` AND `createLogger()` (level omitted) pass
 *   every level through to winston — minimum-level filtering happens once, in
 *   `@molecule/api-logger` (`LOG_LEVEL` / `setLevel()`, default `'info'`).
 *   Passing an explicit `level` to `createLogger()` adds a SECOND, bond-side
 *   gate below the core's; a stricter level there makes the core's
 *   `setLevel('debug')` appear to do nothing — only do this if you actually
 *   want a second, independent filter on this specific instance.
 * - `level: 'silent'` is implemented via winston's `silent: true` flag (there
 *   is no built-in winston 'silent' level) — it drops output unconditionally,
 *   regardless of the configured `level`.
 * - Transport types: `console`, `file`, `http`, and `stream`
 *   (`options.stream` = any writable — handy for tests and in-process sinks).
 *   A transport's own `level` follows the same rules as `createLogger`'s
 *   top-level `level`; omitted, it inherits the parent instance's level
 *   instead of defaulting to anything.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './winston.js'
