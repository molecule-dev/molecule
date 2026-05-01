/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { courseAverage } from './handlers/courseAverage.js'
import { create } from './handlers/create.js'
import { del } from './handlers/del.js'
import { gpa } from './handlers/gpa.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { transcript } from './handlers/transcript.js'
import { update } from './handlers/update.js'

/** Handler map keyed by route handler name. */
export const requestHandlerMap = {
  courseAverage,
  create,
  del,
  gpa,
  list,
  read,
  transcript,
  update,
} as const
