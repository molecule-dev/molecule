/**
 * Winston logger provider for molecule.dev.
 *
 * Provides a full-featured logger implementation using winston.
 *
 * @see https://www.npmjs.com/package/winston
 *
 * @example
 * ```typescript
 * import { logger, setLevel, setLogger } from '@molecule/api-logger'
 * import { createLogger } from '@molecule/api-logger-winston'
 *
 * // Startup: bond once. JSON to stdout, plus warnings and errors to a file. Leave the
 * // top-level `level` unset — the core's LOG_LEVEL / setLevel() gate is the single filter.
 * setLogger(
 *   createLogger({
 *     format: 'json',
 *     transports: [
 *       { type: 'console' },
 *       { type: 'file', level: 'warn', options: { filename: 'logs/errors.log' } },
 *     ],
 *   }),
 * )
 *
 * // Log through the CORE `logger` everywhere.
 * logger.info('Server started', { port: 3000 }) // stdout only
 * // → {"level":"info","message":"Server started","port":3000,"timestamp":"…"}
 * logger.debug('Cache warmed', { keys: 42 }) // DROPPED: the core's default level is 'info'
 * setLevel('debug') // or LOG_LEVEL=debug
 *
 * try {
 *   JSON.parse('{not json')
 * } catch (error) {
 *   logger.error('Failed to parse webhook payload', { error }) // stdout AND logs/errors.log, with stack
 * }
 * ```
 *
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
 * - The default `provider` is colorized, human-readable console output (`format:
 *   'console'`) — use `createLogger({ format: 'json' })` for machine-parsed logs.
 * - Transport types: `console`, `file`, `http`, and `stream`
 *   (`options.stream` = any writable — handy for tests and in-process sinks).
 *   A transport's own `level` follows the same rules as `createLogger`'s
 *   top-level `level`; omitted, it inherits the parent instance's level
 *   instead of defaulting to anything.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './winston.js'
