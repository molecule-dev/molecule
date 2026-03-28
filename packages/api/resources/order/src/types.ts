/**
 * Order resource types.
 *
 * @module
 */

/**
 * Possible states of an order throughout its lifecycle.
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

/**
 * A physical or billing address.
 */
export interface Address {
  /** Street address line 1. */
  line1: string
  /** Street address line 2. */
  line2?: string
  /** City name. */
  city: string
  /** State or province. */
  state?: string
  /** Postal/zip code. */
  postalCode: string
  /** ISO 3166-1 alpha-2 country code. */
  country: string
}

/**
 * A single item within an order.
 */
export interface OrderItem {
  /** Unique identifier for this order line. */
  id: string
  /** The product being purchased. */
  productId: string
  /** Optional variant (size, color, etc.). */
  variantId?: string
  /** Display name of the product. */
  name: string
  /** Unit price at time of purchase. */
  price: number
  /** Quantity ordered. */
  quantity: number
  /** Optional product image URL. */
  image?: string
}

/**
 * A full order record.
 */
export interface Order {
  /** Unique order identifier. */
  id: string
  /** The user who placed this order. */
  userId: string
  /** Current status of the order. */
  status: OrderStatus
  /** Items in this order. */
  items: OrderItem[]
  /** Sum of item prices × quantities before discounts. */
  subtotal: number
  /** Computed tax amount. */
  tax: number
  /** Shipping cost. */
  shipping: number
  /** Discount amount. */
  discount: number
  /** Final total: subtotal − discount + tax + shipping. */
  total: number
  /** Shipping address, if applicable. */
  shippingAddress?: Address
  /** Billing address, if applicable. */
  billingAddress?: Address
  /** Associated payment identifier. */
  paymentId?: string
  /** Order notes from the customer. */
  notes?: string
  /** When the order was created. */
  createdAt: string
  /** When the order was last updated. */
  updatedAt: string
}

/**
 * Input for creating a new order.
 */
export interface CreateOrderInput {
  /** Items to include in the order. */
  items: CreateOrderItemInput[]
  /** Shipping address. */
  shippingAddress?: Address
  /** Billing address. */
  billingAddress?: Address
  /** Associated payment identifier. */
  paymentId?: string
  /** Customer notes. */
  notes?: string
  /** Pre-computed discount amount. */
  discount?: number
  /** Pre-computed shipping cost. */
  shipping?: number
  /** Pre-computed tax amount. */
  tax?: number
}

/**
 * Input for a single order item during creation.
 */
export interface CreateOrderItemInput {
  /** The product to order. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Display name. */
  name: string
  /** Unit price. */
  price: number
  /** Quantity to order. */
  quantity: number
  /** Optional product image URL. */
  image?: string
}

/**
 * Input for updating an order's status.
 */
export interface UpdateOrderStatusInput {
  /** The new status. */
  status: OrderStatus
  /** Optional metadata about the status change. */
  metadata?: Record<string, unknown>
}

/**
 * Input for cancelling an order.
 */
export interface CancelOrderInput {
  /** Reason for cancellation. */
  reason?: string
}

/**
 * Input for refunding an order.
 */
export interface RefundOrderInput {
  /** Partial refund amount. If omitted, full refund is issued. */
  amount?: number
  /** Reason for the refund. */
  reason?: string
}

/**
 * Result of a refund operation.
 */
export interface RefundResult {
  /** The order that was refunded. */
  orderId: string
  /** Amount refunded. */
  amount: number
  /** New order status after refund. */
  status: OrderStatus
  /** When the refund was processed. */
  refundedAt: string
}

/**
 * A historical event in an order's lifecycle.
 */
export interface OrderEvent {
  /** Unique event identifier. */
  id: string
  /** The order this event belongs to. */
  orderId: string
  /** The status at the time of this event. */
  status: OrderStatus
  /** Optional metadata about the event. */
  metadata?: Record<string, unknown>
  /** When this event occurred. */
  createdAt: string
}

/**
 * Query options for listing orders.
 */
export interface OrderQuery {
  /** Filter by status. */
  status?: OrderStatus
  /** Page number (1-based). */
  page?: number
  /** Number of items per page. */
  limit?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The items in this page. */
  data: T[]
  /** Total number of items matching the query. */
  total: number
  /** Current page number (1-based). */
  page: number
  /** Number of items per page. */
  limit: number
}

/**
 * Internal database row for an order.
 */
export interface OrderRow {
  /** Unique order identifier. */
  id: string
  /** The user who placed this order. */
  userId: string
  /** Current status. */
  status: OrderStatus
  /** Sum of item prices × quantities. */
  subtotal: number
  /** Computed tax amount. */
  tax: number
  /** Shipping cost. */
  shipping: number
  /** Discount amount. */
  discount: number
  /** Final total. */
  total: number
  /** JSON-serialized shipping address. */
  shippingAddress: string | null
  /** JSON-serialized billing address. */
  billingAddress: string | null
  /** Associated payment identifier. */
  paymentId: string | null
  /** Customer notes. */
  notes: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}

/**
 * Internal database row for an order item.
 */
export interface OrderItemRow {
  /** Unique order item identifier. */
  id: string
  /** Parent order identifier. */
  orderId: string
  /** The product being purchased. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Display name. */
  name: string
  /** Unit price at time of purchase. */
  price: number
  /** Quantity ordered. */
  quantity: number
  /** Optional product image URL. */
  image: string | null
}

/**
 * Internal database row for an order event.
 */
export interface OrderEventRow {
  /** Unique event identifier. */
  id: string
  /** The order this event belongs to. */
  orderId: string
  /** The status at the time of this event. */
  status: OrderStatus
  /** JSON-serialized metadata. */
  metadata: string | null
  /** When this event occurred. */
  createdAt: string
}

/**
 * Valid order statuses.
 */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

/**
 * Status transitions: maps current status to the set of valid next statuses.
 */
export const STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}
