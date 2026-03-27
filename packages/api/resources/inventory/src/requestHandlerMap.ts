/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

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
} as const
