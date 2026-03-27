/**
 * Inventory utility functions for converting database rows to typed objects.
 *
 * @module
 */

import type {
  LowStockAlert,
  Reservation,
  ReservationRow,
  StockInfo,
  StockMovement,
  StockMovementRow,
  StockRow,
} from './types.js'

/**
 * Converts a database stock row into a typed {@link StockInfo}.
 * @param row - The raw database row.
 * @returns The deserialized stock info.
 */
export function toStockInfo(row: StockRow): StockInfo {
  const available = row.total - row.reserved
  const info: StockInfo = {
    productId: row.productId,
    available,
    reserved: row.reserved,
    total: row.total,
    lowStockThreshold: row.lowStockThreshold,
    isLowStock: available <= row.lowStockThreshold,
  }
  if (row.variantId) info.variantId = row.variantId
  return info
}

/**
 * Converts a database reservation row into a typed {@link Reservation}.
 * @param row - The raw database row.
 * @returns The deserialized reservation.
 */
export function toReservation(row: ReservationRow): Reservation {
  const reservation: Reservation = {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    orderId: row.orderId,
    createdAt: row.createdAt,
  }
  if (row.variantId) reservation.variantId = row.variantId
  return reservation
}

/**
 * Converts a database stock movement row into a typed {@link StockMovement}.
 * @param row - The raw database row.
 * @returns The deserialized stock movement.
 */
export function toStockMovement(row: StockMovementRow): StockMovement {
  const movement: StockMovement = {
    id: row.id,
    productId: row.productId,
    type: row.type,
    quantity: row.quantity,
    createdAt: row.createdAt,
  }
  if (row.variantId) movement.variantId = row.variantId
  if (row.reason) movement.reason = row.reason
  if (row.referenceId) movement.referenceId = row.referenceId
  return movement
}

/**
 * Converts a database stock row into a typed {@link LowStockAlert}.
 * @param row - The raw database row.
 * @returns The low-stock alert.
 */
export function toLowStockAlert(row: StockRow): LowStockAlert {
  const alert: LowStockAlert = {
    productId: row.productId,
    available: row.total - row.reserved,
    threshold: row.lowStockThreshold,
  }
  if (row.variantId) alert.variantId = row.variantId
  return alert
}
