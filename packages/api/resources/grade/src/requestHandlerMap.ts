/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { requireAdmin } from './authorizers/index.js'
import { courseAverage } from './handlers/courseAverage.js'
import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { gpa } from './handlers/gpa.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { transcript } from './handlers/transcript.js'
import { update } from './handlers/update.js'

/**
 * Handler map keyed by route handler name.
 *
 * `requireAdmin` is the grade-management authorizer middleware referenced by the
 * `update`/`del` routes. It must live here (as a real handler-map key) so the
 * mlcl injector's route scanner preserves it — a bare middleware string that
 * isn't a handler-map key is silently dropped.
 */
export const requestHandlerMap = {
  courseAverage,
  create,
  del,
  gpa,
  list,
  read,
  transcript,
  update,
  requireAdmin: requireAdmin(),
} as const
