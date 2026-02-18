/**
 * Type definitions for the Winston logger provider.
 *
 * @module
 */

import type { LogLevel } from '@molecule/api-logger'

export type { Logger, LogLevel } from '@molecule/api-logger'

/**
 * Configuration for a winston transport.
 */
export interface WinstonTransportConfig {
  type: 'console' | 'file' | 'http' | string
  level?: LogLevel
  options?: Record<string, unknown>
}

/**
 * Options for creating a winston logger.
 */
export interface WinstonLoggerOptions {
  level?: LogLevel
  format?: 'json' | 'console'
  transports?: WinstonTransportConfig[]
}
