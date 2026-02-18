/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Map of request handler.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
} as const
