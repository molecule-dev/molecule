/**
 * Logger utility functions for the loglevel provider.
 *
 * @module
 */

import loglevel from 'loglevel'

import type { Logger, LogLevel } from '@molecule/api-logger'

import { levelMap, log } from './provider.js'

/**
 * Alias for the default loglevel instance.
 */
export { log as loglevel } from './provider.js'

/**
 * Sets the minimum log level for the default loglevel instance.
 *
 * @param level - The molecule log level to set.
 */
export const setLevel = (level: LogLevel): void => {
  log.setLevel(levelMap[level])
}

/**
 * Returns the current log level of the default loglevel instance.
 *
 * @returns The current `LogLevel` (e.g. `'info'`, `'debug'`, `'warn'`).
 */
export const getLevel = (): LogLevel => {
  const currentLevel = log.getLevel()
  for (const [name, value] of Object.entries(levelMap)) {
    if (value === currentLevel) {
      return name as LogLevel
    }
  }
  return 'info'
}

/**
 * Creates a named loglevel logger that implements the `Logger` interface.
 *
 * @param options - Logger configuration.
 * @param options.level - The minimum log level.
 * @param options.name - The logger name (used to create a named loglevel instance).
 * @returns A `Logger` backed by loglevel.
 */
export const createLogger = (options?: { level?: LogLevel; name?: string }): Logger => {
  const instance = loglevel.getLogger(options?.name ?? 'molecule')
  if (options?.level) {
    instance.setLevel(levelMap[options.level])
  }
  return {
    trace: (...args) => instance.trace(...args),
    debug: (...args) => instance.debug(...args),
    info: (...args) => instance.info(...args),
    warn: (...args) => instance.warn(...args),
    error: (...args) => instance.error(...args),
  }
}
