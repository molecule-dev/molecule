/**
 * Loglevel logger provider implementation.
 *
 * @module
 */

import loglevel from 'loglevel'

import type { Logger, LogLevel } from '@molecule/api-logger'

/**
 * The underlying loglevel instance.
 */
export const log = loglevel.getLogger('molecule')

/**
 * Map molecule log levels to loglevel levels.
 */
export const levelMap: Record<LogLevel, loglevel.LogLevelNumbers> = {
  trace: loglevel.levels.TRACE,
  debug: loglevel.levels.DEBUG,
  info: loglevel.levels.INFO,
  warn: loglevel.levels.WARN,
  error: loglevel.levels.ERROR,
  silent: loglevel.levels.SILENT,
}

/**
 * The loglevel logger provider implementing the standard interface.
 */
export const provider: Logger = {
  trace: (...args) => log.trace(...args),
  debug: (...args) => log.debug(...args),
  info: (...args) => log.info(...args),
  warn: (...args) => log.warn(...args),
  error: (...args) => log.error(...args),
}
