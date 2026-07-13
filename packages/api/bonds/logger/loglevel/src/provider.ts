/**
 * Loglevel logger provider implementation.
 *
 * @module
 */

import loglevel from 'loglevel'

import type { Logger, LogLevel } from '@molecule/api-logger'

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
 * The underlying loglevel instance.
 */
export const log = loglevel.getLogger('molecule')
// loglevel's OUT-OF-THE-BOX default level is WARN, which silently swallows
// trace/debug/info — the very first thing the core docs do after
// `setLogger(provider)` is `logger.info('Server started…')`, which would print
// NOTHING and look like the logger is broken. Level filtering is the job of
// `@molecule/api-logger` (LOG_LEVEL env var / `setLevel()`, default 'info'),
// so this bond passes everything through rather than double-filtering — a
// second, hidden gate here would make the core's `setLevel('debug')`
// mysteriously no-op. Direct users can still call this package's `setLevel()`.
// (`false` = don't persist the level to localStorage in browser-ish runtimes.)
log.setLevel(levelMap.trace, false)

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
