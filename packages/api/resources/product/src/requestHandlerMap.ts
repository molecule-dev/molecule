/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { createVariant } from './handlers/createVariant.js'
import { del } from './handlers/del.js'
import { list } from './handlers/list.js'
import { listVariants } from './handlers/listVariants.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/** Handler map keyed by route handler name. */
export const requestHandlerMap = {
  create,
  createVariant,
  list,
  listVariants,
  read,
  update,
  del,
} as const
