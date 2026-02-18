/**
 * Logger bond accessor and convenience proxy.
 *
 * Exposes a singleton `logger` object whose methods delegate to the bonded
 * logger provider at call time. If no provider is bonded, methods fall back
 * to the built-in console logger.
 *
 * @module
 */

import { bond, get as bondGet } from '@molecule/api-bond'

import type { Logger } from './types.js'

const BOND_TYPE = 'logger'

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
 * Singleton logger proxy. Each method delegates to the currently bonded
 * logger at call time, so swapping providers via `setLogger()` takes
 * effect immediately without re-importing.
 */
export const logger: Logger = {
  trace: (...args) => getCurrentLogger().trace(...args),
  debug: (...args) => getCurrentLogger().debug(...args),
  info: (...args) => getCurrentLogger().info(...args),
  warn: (...args) => getCurrentLogger().warn(...args),
  error: (...args) => getCurrentLogger().error(...args),
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
