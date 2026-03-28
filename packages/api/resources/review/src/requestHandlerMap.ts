/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { helpful } from './handlers/helpful.js'
import { list } from './handlers/list.js'
import { averageRating } from './handlers/rating.js'
import { read } from './handlers/read.js'
import { update } from './handlers/update.js'

/**
 * Handler map for review routes.
 */
export const requestHandlerMap = {
  create,
  list,
  averageRating,
  read,
  update,
  del,
  helpful,
} as const
