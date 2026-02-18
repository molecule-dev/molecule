/**
 * App-side logger bond accessor, console logger factory, and convenience functions.
 *
 * Provides a built-in console-based logger provider that is auto-created on
 * first access if no custom provider is bonded. The default log level is
 * `'debug'` in development and `'info'` in production.
 *
 * @module
 */

import { createConsoleLogger } from './console-logger.js'
import type { Logger, LoggerConfig, LoggerProvider, LogLevel, LogTransport } from './types.js'

/**
 * Creates a console-based logger provider with configurable log level,
 * named child loggers, and pluggable transports.
 *
 * @param defaultLevel - The initial global log level (defaults to `'info'`).
 * @returns A `LoggerProvider` backed by console output.
 */
export const createConsoleLoggerProvider = (defaultLevel: LogLevel = 'info'): LoggerProvider => {
  let globalLevel = defaultLevel
  let enabled = true
  const globalTransports = new Set<LogTransport>()
  const loggers = new Map<string, ReturnType<typeof createConsoleLogger>>()

  const rootLogger = createConsoleLogger({ level: globalLevel })

  return {
    getLogger: (name?: string) => {
      if (!name) return rootLogger
      if (loggers.has(name)) return loggers.get(name)!
      return rootLogger
    },

    createLogger: (nameOrConfig: string | LoggerConfig, config?: LoggerConfig) => {
      const resolvedName =
        typeof nameOrConfig === 'string' ? nameOrConfig : nameOrConfig.name || 'default'
      const resolvedConfig = typeof nameOrConfig === 'string' ? config : nameOrConfig

      if (loggers.has(resolvedName)) {
        return loggers.get(resolvedName)!
      }

      const logger = createConsoleLogger({
        ...resolvedConfig,
        name: resolvedName,
        level: resolvedConfig?.level || globalLevel,
        transports: [...Array.from(globalTransports), ...(resolvedConfig?.transports || [])],
      })

      loggers.set(resolvedName, logger)
      return logger
    },

    setLevel: (level: LogLevel) => {
      globalLevel = level
      rootLogger.setLevel(level)
      loggers.forEach((logger) => logger.setLevel(level))
    },

    getLevel: () => globalLevel,

    addTransport: (transport: LogTransport) => {
      globalTransports.add(transport)
      rootLogger.addTransport(transport)
      loggers.forEach((logger) => logger.addTransport(transport))
      return () => {
        globalTransports.delete(transport)
        rootLogger.removeTransport(transport)
        loggers.forEach((logger) => logger.removeTransport(transport))
      }
    },

    enable: () => {
      enabled = true
      rootLogger.setLevel(globalLevel)
      loggers.forEach((logger) => logger.setLevel(globalLevel))
    },

    disable: () => {
      enabled = false
      rootLogger.setLevel('silent')
      loggers.forEach((logger) => logger.setLevel('silent'))
    },

    isEnabled: () => enabled,
  }
}

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

const BOND_TYPE = 'app-logger'

/**
 * Registers a logger provider as the active singleton.
 *
 * @param provider - The logger provider implementation to bond.
 */
export const setProvider = (provider: LoggerProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded logger provider. If none is bonded, automatically
 * creates and bonds a console-based provider with log level auto-detected
 * from `NODE_ENV` (`'debug'` in development, `'info'` otherwise).
 *
 * @returns The active logger provider.
 */
export const getProvider = (): LoggerProvider => {
  if (!isBonded(BOND_TYPE)) {
    // Auto-detect log level from environment only (no storage access)
    let defaultLevel: LogLevel = 'info'

    // Check for debug mode via environment
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      defaultLevel = 'debug'
    }

    bond(BOND_TYPE, createConsoleLoggerProvider(defaultLevel))
  }
  return bondGet<LoggerProvider>(BOND_TYPE)!
}

/**
 * Retrieves a logger by name from the bonded provider. Returns the root
 * logger if no name is given.
 *
 * @param name - Optional logger name for scoped logging.
 * @returns The named or root logger.
 */
export const getLogger = (name?: string): Logger => getProvider().getLogger(name)

/**
 * Creates a named logger with optional configuration via the bonded provider.
 *
 * @param nameOrConfig - The logger name string, or a full `LoggerConfig` object.
 * @param config - Optional configuration when the first argument is a name string.
 * @returns A new named logger instance.
 */
export const createLogger = (nameOrConfig: string | LoggerConfig, config?: LoggerConfig): Logger =>
  getProvider().createLogger(nameOrConfig, config)

/**
 * Sets the global log level on the bonded provider, affecting all loggers.
 *
 * @param level - The log level to set (`'trace'`, `'debug'`, `'info'`, `'warn'`, `'error'`, or `'silent'`).
 * @returns Nothing.
 */
export const setLevel = (level: LogLevel): void => getProvider().setLevel(level)

/**
 * Returns the current global log level from the bonded provider.
 *
 * @returns The active log level.
 */
export const getLevel = (): LogLevel => getProvider().getLevel()

/**
 * Logs a trace-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const trace = (message: string, ...args: unknown[]): void =>
  getLogger().trace(message, ...args)

/**
 * Logs a debug-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const debug = (message: string, ...args: unknown[]): void =>
  getLogger().debug(message, ...args)

/**
 * Logs an info-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const info = (message: string, ...args: unknown[]): void =>
  getLogger().info(message, ...args)

/**
 * Logs a warn-level message via the root logger.
 * @param message - The log message string.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const warn = (message: string, ...args: unknown[]): void =>
  getLogger().warn(message, ...args)

/**
 * Logs an error-level message via the root logger.
 * @param message - The error message string or Error object.
 * @param args - Additional arguments to include in the log entry.
 * @returns Nothing.
 */
export const error = (message: string | Error, ...args: unknown[]): void =>
  getLogger().error(message, ...args)
