/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { requireAdmin } from './authorizers/index.js'
import { addTag } from './handlers/addTag.js'
import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { getBySlug } from './handlers/getBySlug.js'
import { list } from './handlers/list.js'
import { popular } from './handlers/popular.js'
import { read } from './handlers/read.js'
import { removeTag } from './handlers/removeTag.js'
import { update } from './handlers/update.js'

/**
 * Handler map for tag resource routes.
 *
 * `requireAdmin` is the admin authorizer middleware referenced by the
 * `update`/`del` routes. It must live here (as a real handler-map key) so the
 * mlcl injector's route scanner preserves it — a bare middleware string that
 * isn't a handler-map key is silently dropped.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  update,
  del,
  popular,
  addTag,
  removeTag,
  getBySlug,
  requireAdmin: requireAdmin(),
} as const
