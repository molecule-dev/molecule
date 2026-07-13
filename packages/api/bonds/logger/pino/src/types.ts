/**
 * Type definitions for the Pino logger provider.
 *
 * @module
 */

import type pino from 'pino'

import type { LogLevel } from '@molecule/api-logger'

export type { Logger, LogLevel } from '@molecule/api-logger'

/**
 * Single transport target configuration.
 */
export interface PinoTransportTarget {
  target: string
  level?: string
  options?: Record<string, unknown>
}

/**
 * Options for creating a pino logger.
 */
export interface PinoLoggerOptions {
  /** Minimum log level for the underlying pino instance. Defaults to `'info'`. */
  level?: LogLevel
  /** Pretty-print via the pino-pretty transport (ignored when `destination` is set). */
  pretty?: boolean
  /** Instance name included in every record. */
  name?: string
  /** Worker-thread transport configuration (ignored when `destination` is set). */
  transport?:
    | { target: string; options?: Record<string, unknown> }
    | { targets: PinoTransportTarget[] }
  /**
   * In-process destination stream (anything with a `write(msg: string)` —
   * e.g. `pino.destination(...)`, a file stream, or a test sink). Takes
   * precedence over `pretty`/`transport`, since pino cannot combine a
   * transport with a stream.
   */
  destination?: pino.DestinationStream
}
