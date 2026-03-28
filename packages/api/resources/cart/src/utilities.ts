/**
 * Cart utility functions for computing totals and assembling cart objects.
 *
 * @module
 */

import type { AppliedCoupon, Cart, CartItem, CartItemRow, CartRow } from './types.js'

/** Default tax rate (percentage). */
const TAX_RATE = 0

/**
 * Converts a database cart-item row into a typed {@link CartItem}.
 * @param row - The raw database row.
 * @returns The deserialized cart item.
 */
export function toCartItem(row: CartItemRow): CartItem {
  const item: CartItem = {
    id: row.id,
    productId: row.productId,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
  }
  if (row.variantId) item.variantId = row.variantId
  if (row.image) item.image = row.image
  if (row.metadata) {
    try {
      item.metadata = JSON.parse(row.metadata) as Record<string, unknown>
    } catch {
      /* ignore malformed JSON */
    }
  }
  return item
}

/**
 * Computes the subtotal from a list of cart items (price × quantity).
 * @param items - The cart items.
 * @returns The subtotal amount.
 */
export function computeSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

/**
 * Computes the discount from an applied coupon and a subtotal.
 * @param coupon - The applied coupon, if any.
 * @param subtotal - The cart subtotal.
 * @returns The discount amount (clamped to subtotal).
 */
export function computeDiscount(coupon: AppliedCoupon | undefined, subtotal: number): number {
  if (!coupon) return 0
  if (coupon.type === 'percentage') {
    return Math.min(subtotal, Math.round(((subtotal * coupon.value) / 100) * 100) / 100)
  }
  return Math.min(subtotal, coupon.value)
}

/**
 * Computes tax from the taxable amount.
 * @param taxableAmount - The amount to tax (subtotal − discount).
 * @returns The tax amount.
 */
export function computeTax(taxableAmount: number): number {
  return Math.round(taxableAmount * TAX_RATE) / 100
}

/**
 * Assembles a full {@link Cart} object from a database cart row and item rows.
 * @param cartRow - The cart database row.
 * @param itemRows - The cart item database rows.
 * @returns The assembled cart.
 */
export function assembleCart(cartRow: CartRow, itemRows: CartItemRow[]): Cart {
  const items = itemRows.map(toCartItem)
  const coupon = cartRow.coupon ? (JSON.parse(cartRow.coupon) as AppliedCoupon) : undefined
  const subtotal = computeSubtotal(items)
  const discount = computeDiscount(coupon, subtotal)
  const tax = computeTax(subtotal - discount)

  return {
    id: cartRow.id,
    userId: cartRow.userId,
    items,
    coupon,
    subtotal,
    discount,
    tax,
    total: subtotal - discount + tax,
    updatedAt: cartRow.updatedAt,
  }
}
