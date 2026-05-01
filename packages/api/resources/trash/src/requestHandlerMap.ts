/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { trashCount } from './handlers/count.js'
import { list } from './handlers/list.js'
import { purge } from './handlers/purge.js'
import { read } from './handlers/read.js'
import { restore } from './handlers/restore.js'
import { trash } from './handlers/trash.js'

/**
 * Handler map for trash routes.
 */
export const requestHandlerMap = {
  trash,
  list,
  trashCount,
  read,
  restore,
  purge,
} as const
