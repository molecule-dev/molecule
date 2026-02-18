/**
 * Console-based logger provider.
 *
 * @module
 */

import type { Logger } from '@molecule/api-logger'

/**
 * Console-based logger implementation.
 */
export const consoleLogger: Logger = {
  trace: (...args) => console.trace(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

/**
 * Default console logger provider.
 */
export const provider: Logger = consoleLogger
