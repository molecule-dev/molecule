/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { requireInventoryAdmin } from './authorizers/index.js'
import { bulkUpdate } from './handlers/bulkUpdate.js'
import { confirm } from './handlers/confirm.js'
import { getAlerts } from './handlers/getAlerts.js'
import { getMovements } from './handlers/getMovements.js'
import { getStock } from './handlers/getStock.js'
import { release } from './handlers/release.js'
import { reserve } from './handlers/reserve.js'
import { updateStock } from './handlers/updateStock.js'

/**
 * Handler map for the inventory resource routes.
 *
 * `requireInventoryAdmin` is the admin authorizer middleware referenced by the
 * `updateStock`/`bulkUpdate` routes. It must live here (as a real handler-map
 * key) so the mlcl injector's route scanner preserves it — a bare middleware
 * string that isn't a handler-map key is silently dropped, which is exactly how
 * the previous bare `'authenticate'` gate became inert.
 */
export const requestHandlerMap = {
  getStock,
  updateStock,
  reserve,
  release,
  confirm,
  getAlerts,
  getMovements,
  bulkUpdate,
  requireInventoryAdmin: requireInventoryAdmin(),
} as const
