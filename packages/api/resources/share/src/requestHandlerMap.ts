/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { createLink } from './handlers/createLink.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { listLinks } from './handlers/listLinks.js'
import { read } from './handlers/read.js'
import { resolveLink } from './handlers/resolveLink.js'
import { revokeLink } from './handlers/revokeLink.js'
import { update } from './handlers/update.js'

/**
 * Handler map for resource-share routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  createLink,
  listLinks,
  revokeLink,
  resolveLink,
} as const
