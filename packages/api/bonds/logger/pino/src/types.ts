/**
 * Type definitions for the Pino logger provider.
 *
 * @module
 */

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
  level?: LogLevel
  pretty?: boolean
  name?: string
  transport?:
    | { target: string; options?: Record<string, unknown> }
    | { targets: PinoTransportTarget[] }
}
