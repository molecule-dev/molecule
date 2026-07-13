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

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

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

/**
 * The active minimum level, or `null` when it has not been resolved yet.
 * Resolution is deferred to first use (see `resolveLevel`) rather than done
 * at module-import time, so that apps loading `dotenv`/`.env` files AFTER
 * their first transitive import of this module still see `LOG_LEVEL`.
 */
let currentLevel: LogLevel | null = null

/**
 * Returns the active level, resolving it from `LOG_LEVEL` on first use and
 * caching the result. `setLevel()` always overrides this cached/resolved
 * value directly.
 *
 * @returns The active `LogLevel`.
 */
const resolveLevel = (): LogLevel => {
  if (currentLevel === null) currentLevel = resolveInitialLevel()
  return currentLevel
}

/**
 * Sets the minimum log level. Messages below this level are silently dropped.
 *
 * @param level - The minimum log level to allow.
 */
export const setLevel = (level: LogLevel): void => {
  currentLevel = level
}

/**
 * Returns the current minimum log level, resolving it from the `LOG_LEVEL`
 * environment variable on first call if `setLevel()` has not been used yet.
 *
 * @returns The active `LogLevel`.
 */
export const getLevel = (): LogLevel => resolveLevel()

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
  LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[resolveLevel()]

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
}

/**
 * Resets the logger back to the built-in console logger.
 */
export const resetLogger = (): void => {
  bond(BOND_TYPE, consoleLogger)
}

/**
 * Checks whether a custom logger provider is active — either bonded via
 * `setLogger()` directly, or wired through `bond('logger', provider)` (the
 * path every bond package's `getLogger()` and this module's own
 * `getCurrentLogger()` honor). Reflects the actual bond registry rather than
 * a flag private to `setLogger()`, so it stays accurate regardless of which
 * wiring path bonded the provider.
 *
 * @returns `true` if a custom (non-console) logger provider is bonded.
 */
export const hasLogger = (): boolean => {
  return isBonded(BOND_TYPE) && bondGet<Logger>(BOND_TYPE) !== consoleLogger
}
