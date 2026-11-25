/**
 * Safe logger accessor for provider bonds.
 *
 * Returns the bonded logger if available, otherwise falls back to console,
 * which prints messages at `LOG_LEVEL` or above (`info` by default), as
 * `@molecule/api-logger` does. This allows provider bonds to log without
 * hard-depending on `@molecule/api-logger`.
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

type Level = keyof MinimalLogger

/** Numeric priority for each level, as `@molecule/api-logger` orders them; `silent` drops everything. */
const LEVEL_PRIORITY: Record<Level | 'silent', number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5,
}

/**
 * Whether the console fallback prints a message of this level: at `LOG_LEVEL` or above, `info`
 * when it is unset or not a level — the same gate `@molecule/api-logger` applies. Read on each call,
 * so a `.env` loaded after the first import still counts.
 *
 * @param level - The message's level.
 * @returns Whether to print it.
 */
function allowed(level: Level): boolean {
  const env = typeof process !== 'undefined' ? process.env?.LOG_LEVEL?.toLowerCase() : undefined
  const min = env && env in LEVEL_PRIORITY ? (env as Level | 'silent') : 'info'
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[min]
}

const consoleFallback: MinimalLogger = {
  trace: (...args) => allowed('trace') && console.trace(...args),
  debug: (...args) => allowed('debug') && console.debug(...args),
  info: (...args) => allowed('info') && console.info(...args),
  warn: (...args) => allowed('warn') && console.warn(...args),
  error: (...args) => allowed('error') && console.error(...args),
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
