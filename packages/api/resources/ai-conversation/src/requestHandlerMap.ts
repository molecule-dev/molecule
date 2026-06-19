/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { authUser } from './authorizers/authUser.js'
import { chat } from './handlers/create.js'
import { clear } from './handlers/del.js'
import { history } from './handlers/list.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Map of request handler names to implementations. `authUser` is the
 * object-level authorization middleware referenced by `routes.ts` for the
 * `chat`/`history`/`clear` routes — registering it here keeps the codegen
 * scanner from stripping it (it only keeps middlewares that are keys of this
 * map), so generated apps actually gate the routes.
 */
export const requestHandlerMap = {
  chat,
  history,
  read,
  update,
  clear,
  authUser,
} as const
