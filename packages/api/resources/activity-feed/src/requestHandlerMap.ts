/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { feed } from './handlers/feed.js'
import { log } from './handlers/logActivity.js'
import { seen } from './handlers/markSeen.js'
import { timeline } from './handlers/timeline.js'
import { unseen } from './handlers/unseen.js'

/**
 * Handler map for activity feed routes.
 */
export const requestHandlerMap = {
  logActivity: log,
  feed,
  unseen,
  markSeen: seen,
  timeline,
} as const
