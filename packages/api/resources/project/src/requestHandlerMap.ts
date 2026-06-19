/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { authUser } from './authorizers/authUser.js'
import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Map of request handler names to implementations. `authUser` is the
 * object-level authorization middleware referenced by `routes.ts` for the
 * `read`/`update`/`del` routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  authUser,
} as const
