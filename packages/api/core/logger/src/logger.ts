/**
 * Logger bond accessor and convenience proxy.
 *
 * Exposes a singleton `logger` object whose methods delegate to the bonded
 * logger provider at call time. If no provider is bonded, methods fall back
 * to the built-in console logger.
 *
 * The minimum log level defaults to `'info'` and can be changed via the
 * `LOG_LEVEL` environment variable or `setLevel()`. Messages below the
 * active level are silently dropped before reaching any provider.
 *
 * @module
 */

import { bond, get as bondGet } from '@molecule/api-bond'

import type { Logger, LogLevel } from './types.js'

const BOND_TYPE = 'logger'

/** Numeric priority for each log level (higher = more severe). */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
}

/**
 * Resolves the initial log level from the `LOG_LEVEL` environment variable.
 * Falls back to `'info'` if unset or invalid.
 *
 * @returns The resolved log level.
 */
const resolveInitialLevel = (): LogLevel => {
  const env = typeof process !== 'undefined' ? process.env?.LOG_LEVEL?.toLowerCase() : undefined
  if (env && env in LEVEL_PRIORITY) return env as LogLevel
  return 'info'
}

let currentLevel: LogLevel = resolveInitialLevel()

/**
 * Sets the minimum log level. Messages below this level are silently dropped.
 *
 * @param level - The minimum log level to allow.
 */
export const setLevel = (level: LogLevel): void => {
  currentLevel = level
}

/**
 * Returns the current minimum log level.
 *
 * @returns The active `LogLevel`.
 */
export const getLevel = (): LogLevel => currentLevel

/**
 * Built-in console logger used as the default when no provider is bonded.
 */
const consoleLogger: Logger = {
  trace: (...args) => console.trace(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

/** Tracks whether a custom logger has been bonded via `setLogger()`. */
let customLoggerSet = false

/**
 * Returns the bonded logger or the built-in console logger.
 *
 * @returns The active logger instance.
 */
const getCurrentLogger = (): Logger => {
  return bondGet<Logger>(BOND_TYPE) ?? consoleLogger
}

/**
 * Returns `true` if a message at the given level should be emitted.
 *
 * @param level - The log level to check.
 * @returns Whether the level meets the current minimum threshold.
 */
const shouldLog = (level: LogLevel): boolean =>
  LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel]

/**
 * Singleton logger proxy. Each method delegates to the currently bonded
 * logger at call time, so swapping providers via `setLogger()` takes
 * effect immediately without re-importing.
 *
 * Messages below the active minimum level (set via `LOG_LEVEL` env var
 * or `setLevel()`) are silently dropped.
 */
export const logger: Logger = {
  trace: (...args) => {
    if (shouldLog('trace')) getCurrentLogger().trace(...args)
  },
  debug: (...args) => {
    if (shouldLog('debug')) getCurrentLogger().debug(...args)
  },
  info: (...args) => {
    if (shouldLog('info')) getCurrentLogger().info(...args)
  },
  warn: (...args) => {
    if (shouldLog('warn')) getCurrentLogger().warn(...args)
  },
  error: (...args) => {
    if (shouldLog('error')) getCurrentLogger().error(...args)
  },
}

/**
 * Registers a logger implementation as the active provider.
 *
 * @param newLogger - The logger implementation to bond.
 */
export const setLogger = (newLogger: Logger): void => {
  bond(BOND_TYPE, newLogger)
  customLoggerSet = true
}

/**
 * Resets the logger back to the built-in console logger.
 */
export const resetLogger = (): void => {
  bond(BOND_TYPE, consoleLogger)
  customLoggerSet = false
}

/**
 * Checks whether a custom logger has been bonded via `setLogger()`.
 *
 * @returns `true` if a custom logger provider has been set.
 */
export const hasLogger = (): boolean => {
  return customLoggerSet
}
