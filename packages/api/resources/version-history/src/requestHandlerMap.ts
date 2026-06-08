/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { versionCount } from './handlers/count.js'
import { create } from './handlers/create.js'
import { diff } from './handlers/diff.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { readByNumber } from './handlers/readByNumber.js'
import { restore } from './handlers/restore.js'

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
