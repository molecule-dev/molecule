/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import {
  create,
  del,
  favorite,
  feed,
  list,
  read,
  tags,
  unfavorite,
  update,
} from './handlers/index.js'

/**
 * Handler map for article routes.
 */
export const requestHandlerMap = {
  create,
  list,
  feed,
  tags,
  read,
  update,
  del,
  favorite,
  unfavorite,
} as const
