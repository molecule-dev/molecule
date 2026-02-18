/**
 * Winston utilities and raw exports.
 *
 * @module
 */

import winston from 'winston'

/**
 * Winston transports for convenience.
 */
export const transports = winston.transports

/**
 * Winston format utilities for convenience.
 */
export const format = winston.format

/**
 * Legacy export - the raw winston module.
 * @deprecated Use provider or createLogger() instead.
 */
export { winston }
