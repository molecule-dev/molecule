/**
 * Type definitions for the logger interface.
 *
 * @module
 */

/**
 * Log levels supported by the logger.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'

/**
 * Logger interface that all implementations must satisfy.
 */
export interface Logger {
  trace(...args: unknown[]): void
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
}
