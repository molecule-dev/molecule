/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { addItem } from './handlers/addItem.js'
import { applyCoupon } from './handlers/applyCoupon.js'
import { clearCart } from './handlers/clearCart.js'
import { getCart } from './handlers/getCart.js'
import { getCartSummary } from './handlers/getCartSummary.js'
import { removeCoupon } from './handlers/removeCoupon.js'
import { removeItem } from './handlers/removeItem.js'
import { updateQuantity } from './handlers/updateQuantity.js'

/**
 * Handler map for the cart resource routes.
 */
export const requestHandlerMap = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  getCartSummary,
} as const
