/**
 * Type definitions for the Winston logger provider.
 *
 * @module
 */

import type { LogLevel } from '@molecule/api-logger'

export type { Logger, LogLevel } from '@molecule/api-logger'

/**
 * Configuration for a winston transport.
 *
 * `stream` expects a writable stream in `options.stream` — useful for tests
 * and in-process sinks. Unknown types fall back to a console transport.
 */
export interface WinstonTransportConfig {
  type: 'console' | 'file' | 'http' | 'stream' | string
  /** Per-transport level override. Omitted = inherit the parent logger's level (NOT pass-through). */
  level?: LogLevel
  options?: Record<string, unknown>
}

/**
 * Options for creating a winston logger.
 */
export interface WinstonLoggerOptions {
  /**
   * Minimum level for the winston instance. Defaults to `'trace'`
   * (pass-through, via winston's `'silly'` level) — minimum-level filtering
   * is meant to happen once, in `@molecule/api-logger`'s gate (`LOG_LEVEL` /
   * `setLevel()`). Pass an explicit `level` only to add a second, stricter
   * gate on this instance specifically. `'silent'` is implemented via
   * winston's `silent: true` flag (winston has no built-in `'silent'` level).
   */
  level?: LogLevel
  /** Output format. Defaults to `'json'` (timestamps + error stacks); `'console'` is colorized. */
  format?: 'json' | 'console'
  /** Transports to attach. Defaults to a single console transport. */
  transports?: WinstonTransportConfig[]
}
