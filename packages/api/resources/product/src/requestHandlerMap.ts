/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { requireAdmin } from './authorizers/index.js'
import { create } from './handlers/create.js'
import { createVariant } from './handlers/createVariant.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { listVariants } from './handlers/listVariants.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Handler map keyed by route handler name.
 *
 * `requireAdmin` is the admin authorizer middleware referenced by the
 * `update`/`del`/`createVariant` routes. It must live here (as a real handler-map
 * key) so the mlcl injector's route scanner preserves it — a bare middleware
 * string that isn't a handler-map key is silently dropped.
 */
export const requestHandlerMap = {
  create,
  createVariant,
  list,
  listVariants,
  read,
  update,
  del,
  requireAdmin: requireAdmin(),
} as const
