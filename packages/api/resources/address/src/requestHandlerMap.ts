/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { setAsDefault, update } from './handlers/update.js'

/**
 * Handler map for address routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  setAsDefault,
  del,
} as const
