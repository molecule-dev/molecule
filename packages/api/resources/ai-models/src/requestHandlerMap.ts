/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { list } from './handlers/list.js'

/**
 * Map of request handlers for the AI model catalog routes.
 */
export const requestHandlerMap = {
  list,
} as const
