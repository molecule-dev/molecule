/**
 * Maps streak route handler names to their implementations.
 *
 * @module
 */

import { freeze } from './handlers/freeze.js'
import { read } from './handlers/read.js'
import { record } from './handlers/record.js'

/**
 * Handler map for streak routes (`record`, `read`, `freeze`).
 */
export const requestHandlerMap = {
  record,
  read,
  freeze,
} as const
