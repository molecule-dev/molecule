/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { cancel } from './handlers/cancel.js'
import { create } from './handlers/create.js'
import { getHistory } from './handlers/getHistory.js'
import { list } from './handlers/list.js'
import { read } from './handlers/read.js'
import { refund } from './handlers/refund.js'
import { updateStatus } from './handlers/updateStatus.js'

/**
 * Handler map for the order resource routes.
 */
export const requestHandlerMap = {
  create,
  list,
  read,
  updateStatus,
  cancel,
  refund,
  getHistory,
} as const
