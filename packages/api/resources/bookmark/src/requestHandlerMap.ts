/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { check } from './handlers/read.js'
import { folders } from './handlers/update.js'

/**
 * Handler map for bookmark routes.
 */
export const requestHandlerMap = {
  create,
  list,
  check,
  folders,
  del,
} as const
