/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { accept, invite, listInvites, revoke } from './handlers/invites.js'
import { list } from './handlers/list.js'
import { listAll, remove, updateRole } from './handlers/members.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Handler map for workspace routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  listAll,
  updateRole,
  remove,
  invite,
  listInvites,
  revoke,
  accept,
} as const
