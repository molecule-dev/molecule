/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { book } from './handlers/book.js'
import { cancel } from './handlers/cancel.js'
import { checkAvailability } from './handlers/checkAvailability.js'
import { complete } from './handlers/complete.js'
import { confirm } from './handlers/confirm.js'
import { getBookings } from './handlers/getBookings.js'
import { getById } from './handlers/getById.js'
import { reschedule } from './handlers/reschedule.js'

/**
 * Handler map for the booking resource routes.
 */
export const requestHandlerMap = {
  checkAvailability,
  book,
  getBookings,
  getById,
  cancel,
  reschedule,
  confirm,
  complete,
} as const
