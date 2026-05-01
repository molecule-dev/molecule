/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { createSetupIntent } from './handlers/createSetupIntent.js'
import { deletePaymentMethod } from './handlers/deletePaymentMethod.js'
import { listPaymentMethods } from './handlers/listPaymentMethods.js'
import { setDefaultPaymentMethod } from './handlers/setDefaultPaymentMethod.js'

/**
 * Handler map for the payment-method resource routes.
 */
export const requestHandlerMap = {
  createSetupIntent,
  listPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} as const
