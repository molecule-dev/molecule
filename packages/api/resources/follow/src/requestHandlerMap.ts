/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { following } from './handlers/read.js'
import { checkFollowing } from './handlers/update.js'

/**
 * Handler map for follow routes.
 */
export const requestHandlerMap = {
  create,
  del,
  list,
  following,
  checkFollowing,
} as const
