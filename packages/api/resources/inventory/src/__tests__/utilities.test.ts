import { describe, expect, it } from 'vitest'

import type { ReservationRow, StockMovementRow, StockRow } from '../types.js'
import { toLowStockAlert, toReservation, toStockInfo, toStockMovement } from '../utilities.js'

describe('inventory utilities', () => {
  describe('toStockInfo', () => {
    it('should convert a stock row to StockInfo', () => {
      const row: StockRow = {
        id: 's1',
        productId: 'prod-1',
        variantId: null,
        total: 100,
        reserved: 20,
        lowStockThreshold: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const info = toStockInfo(row)

      expect(info).toEqual({
        productId: 'prod-1',
        available: 80,
        reserved: 20,
        total: 100,
        lowStockThreshold: 10,
        isLowStock: false,
      })
      expect(info.variantId).toBeUndefined()
    })

    it('should include variantId when present', () => {
      const row: StockRow = {
        id: 's1',
        productId: 'prod-1',
        variantId: 'var-1',
        total: 50,
        reserved: 0,
        lowStockThreshold: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const info = toStockInfo(row)

      expect(info.variantId).toBe('var-1')
    })

    it('should flag low stock when available <= threshold', () => {
      const row: StockRow = {
        id: 's1',
        productId: 'prod-1',
        variantId: null,
        total: 15,
        reserved: 10,
        lowStockThreshold: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const info = toStockInfo(row)

      expect(info.available).toBe(5)
      expect(info.isLowStock).toBe(true)
    })

    it('should flag low stock when available equals threshold', () => {
      const row: StockRow = {
        id: 's1',
        productId: 'prod-1',
        variantId: null,
        total: 20,
        reserved: 10,
        lowStockThreshold: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const info = toStockInfo(row)

      expect(info.available).toBe(10)
      expect(info.isLowStock).toBe(true)
    })
  })

  describe('toReservation', () => {
    it('should convert a reservation row', () => {
      const row: ReservationRow = {
        id: 'r1',
        productId: 'prod-1',
        variantId: null,
        quantity: 5,
        orderId: 'order-1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const reservation = toReservation(row)

      expect(reservation).toEqual({
        id: 'r1',
        productId: 'prod-1',
        quantity: 5,
        orderId: 'order-1',
        createdAt: '2024-01-01T00:00:00Z',
      })
      expect(reservation.variantId).toBeUndefined()
    })

    it('should include variantId when present', () => {
      const row: ReservationRow = {
        id: 'r1',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 3,
        orderId: 'order-1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const reservation = toReservation(row)

      expect(reservation.variantId).toBe('var-1')
    })
  })

  describe('toStockMovement', () => {
    it('should convert a movement row with minimal fields', () => {
      const row: StockMovementRow = {
        id: 'm1',
        productId: 'prod-1',
        variantId: null,
        type: 'adjustment',
        quantity: 10,
        reason: null,
        referenceId: null,
        createdAt: '2024-01-01T00:00:00Z',
      }

      const movement = toStockMovement(row)

      expect(movement).toEqual({
        id: 'm1',
        productId: 'prod-1',
        type: 'adjustment',
        quantity: 10,
        createdAt: '2024-01-01T00:00:00Z',
      })
      expect(movement.variantId).toBeUndefined()
      expect(movement.reason).toBeUndefined()
      expect(movement.referenceId).toBeUndefined()
    })

    it('should include optional fields when present', () => {
      const row: StockMovementRow = {
        id: 'm1',
        productId: 'prod-1',
        variantId: 'var-1',
        type: 'reservation',
        quantity: -5,
        reason: 'Order placed',
        referenceId: 'order-1',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const movement = toStockMovement(row)

      expect(movement.variantId).toBe('var-1')
      expect(movement.reason).toBe('Order placed')
      expect(movement.referenceId).toBe('order-1')
    })
  })

  describe('toLowStockAlert', () => {
    it('should convert a stock row to an alert', () => {
      const row: StockRow = {
        id: 's1',
        productId: 'prod-1',
        variantId: null,
        total: 15,
        reserved: 10,
        lowStockThreshold: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const alert = toLowStockAlert(row)

      expect(alert).toEqual({
        productId: 'prod-1',
        available: 5,
        threshold: 10,
      })
      expect(alert.variantId).toBeUndefined()
    })

    it('should include variantId when present', () => {
      const row: StockRow = {
        id: 's1',
        productId: 'prod-1',
        variantId: 'var-1',
        total: 8,
        reserved: 3,
        lowStockThreshold: 10,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const alert = toLowStockAlert(row)

      expect(alert.variantId).toBe('var-1')
      expect(alert.available).toBe(5)
    })
  })
})
