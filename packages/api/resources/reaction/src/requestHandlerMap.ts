/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'

/**
 * Handler map for reaction routes.
 */
export const requestHandlerMap = {
  create,
  del,
  list,
} as const
