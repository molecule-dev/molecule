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
  level?: LogLevel
  options?: Record<string, unknown>
}

/**
 * Options for creating a winston logger.
 */
export interface WinstonLoggerOptions {
  /**
   * Minimum level for the winston instance. Defaults to `'info'` — a
   * bond-side gate that drops the core's `debug`/`trace` even after
   * `setLevel('debug')` in `@molecule/api-logger`. Pass `'trace'` when the
   * core's gate should be the only filter (what the default `provider` does).
   */
  level?: LogLevel
  /** Output format. Defaults to `'json'` (timestamps + error stacks); `'console'` is colorized. */
  format?: 'json' | 'console'
  /** Transports to attach. Defaults to a single console transport. */
  transports?: WinstonTransportConfig[]
}
