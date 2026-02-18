/**
 * Safe logger accessor for provider bonds.
 *
 * Returns the bonded logger if available, otherwise falls back to console.
 * This allows provider bonds to log without hard-depending on `@molecule/api-logger`.
 *
 * @module
 */

import { get } from './bond.js'

interface MinimalLogger {
  trace: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const consoleFallback: MinimalLogger = {
  trace: (...args) => console.trace(...args),
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

/**
 * Get the bonded logger, falling back to console.
 *
 * Returns a lazy proxy that resolves the bonded logger on each call,
 * so it's safe to call at module scope (`const logger = getLogger()`).
 * If a logger is bonded later, the proxy will pick it up automatically.
 *
 * Safe to call even if `@molecule/api-logger` isn't installed.
 * Provider bonds should use this instead of importing from `@molecule/api-logger` directly.
 *
 * @example
 * ```typescript
 * import { getLogger } from '`@molecule/api-bond`'
 *
 * const logger = getLogger()
 * logger.info('Cache connected')
 * ```
 * @returns A logger object whose methods delegate to the bonded logger or console.
 */
export function getLogger(): MinimalLogger {
  return {
    trace: (...args) => (get<MinimalLogger>('logger') ?? consoleFallback).trace(...args),
    debug: (...args) => (get<MinimalLogger>('logger') ?? consoleFallback).debug(...args),
    info: (...args) => (get<MinimalLogger>('logger') ?? consoleFallback).info(...args),
    warn: (...args) => (get<MinimalLogger>('logger') ?? consoleFallback).warn(...args),
    error: (...args) => (get<MinimalLogger>('logger') ?? consoleFallback).error(...args),
  }
}
