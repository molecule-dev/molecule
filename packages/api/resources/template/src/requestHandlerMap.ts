/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { instantiate } from './handlers/instantiate.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Handler map for resource-template routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  instantiate,
} as const
