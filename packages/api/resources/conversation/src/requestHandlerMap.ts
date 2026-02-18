/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { chat } from './handlers/create.js'
import { clear } from './handlers/del.js'
import { history } from './handlers/list.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Map of request handler.
 */
export const requestHandlerMap = {
  chat,
  history,
  read,
  update,
  clear,
} as const
