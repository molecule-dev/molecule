/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { create } from './handlers/create.js'
import { diff } from './handlers/diff.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { readByNumber } from './handlers/readByNumber.js'
import { restore } from './handlers/restore.js'
import { versionCount } from './handlers/count.js'

/**
 * Handler map for version-history routes.
 */
export const requestHandlerMap = {
  create,
  list,
  versionCount,
  readByNumber,
  read,
  restore,
  diff,
} as const
