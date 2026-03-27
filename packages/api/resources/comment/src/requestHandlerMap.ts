/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { commentCount } from './handlers/count.js'
import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { replies } from './handlers/replies.js'
import { update } from './handlers/update.js'

/**
 * Handler map for comment routes.
 */
export const requestHandlerMap = {
  create,
  list,
  commentCount,
  read,
  update,
  del,
  replies,
} as const
