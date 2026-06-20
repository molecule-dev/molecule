/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { authenticate, requireAdmin, requireSelfOrAdmin } from './authorizers/index.js'
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
 * `requireAdmin` (write routes), `authenticate` (read routes: `list`/`read`/
 * `courseAverage`), and `requireSelfOrAdmin` (per-student `gpa`/`transcript`) are
 * the authorizer middlewares referenced by `routes.ts`. They must live here (as
 * real handler-map keys) so the mlcl injector's route scanner preserves them — a
 * bare middleware string that isn't a handler-map key is silently dropped, which
 * is exactly what once left the entire read side unauthenticated.
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
  authenticate: authenticate(),
  requireAdmin: requireAdmin(),
  requireSelfOrAdmin: requireSelfOrAdmin(),
} as const
