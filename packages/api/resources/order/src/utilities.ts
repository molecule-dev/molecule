/**
 * Order utility functions for converting database rows and computing totals.
 *
 * @module
 */

import type {
  Address,
  Order,
  OrderEvent,
  OrderEventRow,
  OrderItem,
  OrderItemRow,
  OrderRow,
} from './types.js'

/**
 * Converts a database order-item row into a typed {@link OrderItem}.
 * @param row - The raw database row.
 * @returns The deserialized order item.
 */
export function toOrderItem(row: OrderItemRow): OrderItem {
  const item: OrderItem = {
    id: row.id,
    productId: row.productId,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
  }
  if (row.variantId) item.variantId = row.variantId
  if (row.image) item.image = row.image
  return item
}

/**
 * Converts a database order-event row into a typed {@link OrderEvent}.
 * @param row - The raw database row.
 * @returns The deserialized order event.
 */
export function toOrderEvent(row: OrderEventRow): OrderEvent {
  const event: OrderEvent = {
    id: row.id,
    orderId: row.orderId,
    status: row.status,
    createdAt: row.createdAt,
  }
  if (row.metadata) {
    try {
      event.metadata = JSON.parse(row.metadata) as Record<string, unknown>
    } catch {
      /* ignore malformed JSON */
    }
  }
  return event
}

/**
 * Parses a JSON-serialized address, returning undefined if null or malformed.
 * @param json - The JSON string or null.
 * @returns The parsed address or undefined.
 */
function parseAddress(json: string | null): Address | undefined {
  if (!json) return undefined
  try {
    return JSON.parse(json) as Address
  } catch {
    return undefined
  }
}

/**
 * Assembles a full {@link Order} object from a database order row and item rows.
 * @param orderRow - The order database row.
 * @param itemRows - The order item database rows.
 * @returns The assembled order.
 */
export function assembleOrder(orderRow: OrderRow, itemRows: OrderItemRow[]): Order {
  const items = itemRows.map(toOrderItem)

  const order: Order = {
    id: orderRow.id,
    userId: orderRow.userId,
    status: orderRow.status,
    items,
    subtotal: orderRow.subtotal,
    tax: orderRow.tax,
    shipping: orderRow.shipping,
    discount: orderRow.discount,
    total: orderRow.total,
    createdAt: orderRow.createdAt,
    updatedAt: orderRow.updatedAt,
  }

  const shippingAddress = parseAddress(orderRow.shippingAddress)
  if (shippingAddress) order.shippingAddress = shippingAddress

  const billingAddress = parseAddress(orderRow.billingAddress)
  if (billingAddress) order.billingAddress = billingAddress

  if (orderRow.paymentId) order.paymentId = orderRow.paymentId
  if (orderRow.notes) order.notes = orderRow.notes

  return order
}

/**
 * Computes the subtotal from a list of order items (price × quantity).
 * @param items - The order items.
 * @returns The subtotal amount.
 */
export function computeSubtotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}
