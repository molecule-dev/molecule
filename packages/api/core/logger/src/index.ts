/**
 * Logger core interface for molecule.dev.
 *
 * Provides an abstract logging interface with a built-in console logger.
 * Use `setLogger` to swap in a provider like pino, winston, or loglevel.
 *
 * @example
 * ```typescript
 * import { logger, setLogger, resetLogger } from '@molecule/api-logger'
 *
 * // Use the default console logger
 * logger.info('Server started on port', 3000)
 * logger.debug('Request received', { method: 'GET', path: '/api' })
 * logger.warn('Rate limit approaching')
 * logger.error('Database connection failed', error)
 *
 * // Set a custom logger provider
 * import { log } from '@molecule/api-logger-loglevel'
 * setLogger(log)
 *
 * // Reset to default console logger
 * resetLogger()
 * ```
 *
 * @module
 */

export * from './logger.js'
export * from './types.js'
