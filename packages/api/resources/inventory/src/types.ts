/**
 * Inventory resource types.
 *
 * @module
 */

/**
 * Types of stock adjustment operations.
 */
export type StockAdjustmentType = 'add' | 'remove' | 'set'

/**
 * Types of stock movements recorded in the movement history.
 */
export type StockMovementType = 'adjustment' | 'reservation' | 'release' | 'confirmation'

/**
 * Current stock information for a product or variant.
 */
export interface StockInfo {
  /** The product this stock belongs to. */
  productId: string
  /** Optional variant identifier (size, color, etc.). */
  variantId?: string
  /** Quantity available for purchase (total − reserved). */
  available: number
  /** Quantity currently reserved by pending orders. */
  reserved: number
  /** Total quantity in stock (available + reserved). */
  total: number
  /** Threshold below which the product is considered low-stock. */
  lowStockThreshold: number
  /** Whether current available stock is at or below the threshold. */
  isLowStock: boolean
}

/**
 * Input for adjusting stock levels.
 */
export interface StockAdjustment {
  /** Optional variant identifier. */
  variantId?: string
  /** Quantity to adjust by (or absolute value for 'set'). */
  quantity: number
  /** Type of adjustment: add, remove, or set to absolute value. */
  type: StockAdjustmentType
  /** Human-readable reason for the adjustment. */
  reason?: string
}

/**
 * A stock reservation tied to an order.
 */
export interface Reservation {
  /** Unique reservation identifier. */
  id: string
  /** The product being reserved. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Quantity reserved. */
  quantity: number
  /** The order this reservation belongs to. */
  orderId: string
  /** When the reservation was created. */
  createdAt: string
}

/**
 * Input for creating a stock reservation.
 */
export interface ReserveStockInput {
  /** Quantity to reserve. */
  quantity: number
  /** The order to associate this reservation with. */
  orderId: string
}

/**
 * A low-stock alert entry.
 */
export interface LowStockAlert {
  /** The product that is low on stock. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Current available quantity. */
  available: number
  /** The low-stock threshold. */
  threshold: number
}

/**
 * A record of a stock movement (adjustment, reservation, release, or confirmation).
 */
export interface StockMovement {
  /** Unique movement identifier. */
  id: string
  /** The product affected. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Type of movement. */
  type: StockMovementType
  /** Quantity change (positive for additions, negative for removals). */
  quantity: number
  /** Reason or description for this movement. */
  reason?: string
  /** Associated order or reservation identifier. */
  referenceId?: string
  /** When this movement occurred. */
  createdAt: string
}

/**
 * Pagination options for list queries.
 */
export interface PaginationOptions {
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
 * Input for a single item in a bulk stock update.
 */
export interface BulkStockAdjustment {
  /** The product to adjust. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Quantity to adjust. */
  quantity: number
  /** Type of adjustment. */
  type: StockAdjustmentType
  /** Reason for the adjustment. */
  reason?: string
}

/**
 * Result of a single item in a bulk update.
 */
export interface BulkUpdateItemResult {
  /** The product that was adjusted. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Whether this individual adjustment succeeded. */
  success: boolean
  /** Error message if the adjustment failed. */
  error?: string
  /** Updated stock info if successful. */
  stock?: StockInfo
}

/**
 * Result of a bulk stock update operation.
 */
export interface BulkUpdateResult {
  /** Total number of adjustments attempted. */
  total: number
  /** Number of successful adjustments. */
  succeeded: number
  /** Number of failed adjustments. */
  failed: number
  /** Per-item results. */
  results: BulkUpdateItemResult[]
}

// ── Database row types ────────────────────────────────────────────────

/**
 * Internal database row for an inventory stock record.
 */
export interface StockRow {
  /** Unique stock record identifier. */
  id: string
  /** The product this stock belongs to. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Total quantity in stock. */
  total: number
  /** Quantity currently reserved. */
  reserved: number
  /** Low-stock threshold. */
  lowStockThreshold: number
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}

/**
 * Internal database row for a stock reservation.
 */
export interface ReservationRow {
  /** Unique reservation identifier. */
  id: string
  /** The product being reserved. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Quantity reserved. */
  quantity: number
  /** The order this reservation belongs to. */
  orderId: string
  /** Creation timestamp. */
  createdAt: string
}

/**
 * Internal database row for a stock movement.
 */
export interface StockMovementRow {
  /** Unique movement identifier. */
  id: string
  /** The product affected. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Type of movement. */
  type: StockMovementType
  /** Quantity change. */
  quantity: number
  /** Reason for this movement. */
  reason: string | null
  /** Associated reference identifier. */
  referenceId: string | null
  /** Creation timestamp. */
  createdAt: string
}
