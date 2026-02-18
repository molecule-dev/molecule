/**
 * Type definitions for the logger module.
 *
 * @module
 */

/**
 * Available log severity levels, ordered from most verbose (trace) to silent.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'

/**
 * Log level priority (lower = more verbose).
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
}

/**
 * Structured log entry passed to transports, containing the level, message, timestamp, and optional context.
 */
export interface LogEntry {
  /**
   * Log level.
   */
  level: Exclude<LogLevel, 'silent'>

  /**
   * Log message.
   */
  message: string

  /**
   * Additional arguments.
   */
  args: unknown[]

  /**
   * Timestamp.
   */
  timestamp: Date

  /**
   * Logger name/namespace.
   */
  logger?: string

  /**
   * Additional context.
   */
  context?: Record<string, unknown>
}

/**
 * Log transport function. Receives each log entry for custom
 * processing (e.g. remote logging, file output, error tracking).
 *
 * @param entry - The log entry containing level, message, timestamp, and context.
 */
export type LogTransport = (entry: LogEntry) => void

/**
 * Configuration for creating a logger instance.
 */
export interface LoggerConfig {
  /**
   * Minimum log level.
   */
  level?: LogLevel

  /**
   * Logger name/namespace.
   */
  name?: string

  /**
   * Additional transports (remote logging, file, etc.).
   */
  transports?: LogTransport[]

  /**
   * Whether to include timestamps in console output.
   */
  timestamps?: boolean

  /**
   * Custom log format function.
   */
  format?: (entry: LogEntry) => string

  /**
   * Default context to include with all logs.
   */
  context?: Record<string, unknown>
}

/**
 * Logger instance with leveled logging methods, child logger creation,
 * and transport management.
 */
export interface Logger {
  /**
   * Logs a trace message.
   */
  trace(message: string, ...args: unknown[]): void

  /**
   * Logs a debug message.
   */
  debug(message: string, ...args: unknown[]): void

  /**
   * Logs an info message.
   */
  info(message: string, ...args: unknown[]): void

  /**
   * Logs a warning message.
   */
  warn(message: string, ...args: unknown[]): void

  /**
   * Logs an error message.
   */
  error(message: string | Error, ...args: unknown[]): void

  /**
   * Sets the log level.
   */
  setLevel(level: LogLevel): void

  /**
   * Gets the current log level.
   */
  getLevel(): LogLevel

  /**
   * Creates a child logger with a namespace.
   */
  child(name: string, context?: Record<string, unknown>): Logger

  /**
   * Adds additional context to the logger.
   */
  withContext(context: Record<string, unknown>): Logger

  /**
   * Adds a transport.
   */
  addTransport(transport: LogTransport): () => void

  /**
   * Removes a transport.
   */
  removeTransport(transport: LogTransport): void
}

/**
 * Logger provider interface that all logger bond packages must implement.
 * Creates and manages logger instances and global log configuration.
 */
export interface LoggerProvider {
  /**
   * Gets a logger by name, or the root logger if no name given.
   */
  getLogger(name?: string): Logger

  /**
   * Creates a named logger.
   */
  createLogger(nameOrConfig: string | LoggerConfig, config?: LoggerConfig): Logger

  /**
   * Sets the global log level.
   */
  setLevel(level: LogLevel): void

  /**
   * Gets the global log level.
   */
  getLevel(): LogLevel

  /**
   * Adds a global transport.
   */
  addTransport(transport: LogTransport): () => void

  /**
   * Enables logging.
   */
  enable(): void

  /**
   * Disables logging.
   */
  disable(): void

  /**
   * Checks if logging is enabled.
   *
   * @returns `true` if logging is currently enabled.
   */
  isEnabled(): boolean
}
