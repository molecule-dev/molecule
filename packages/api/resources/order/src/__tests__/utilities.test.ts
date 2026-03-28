import { describe, expect, it } from 'vitest'

import type { OrderEventRow, OrderItemRow, OrderRow } from '../types.js'
import { assembleOrder, computeSubtotal, toOrderEvent, toOrderItem } from '../utilities.js'

describe('order utilities', () => {
  describe('toOrderItem', () => {
    it('should convert a row to an order item', () => {
      const row: OrderItemRow = {
        id: 'i1',
        orderId: 'o1',
        productId: 'p1',
        variantId: null,
        name: 'Widget',
        price: 10,
        quantity: 2,
        image: null,
      }

      const item = toOrderItem(row)

      expect(item).toEqual({
        id: 'i1',
        productId: 'p1',
        name: 'Widget',
        price: 10,
        quantity: 2,
      })
      expect(item.variantId).toBeUndefined()
      expect(item.image).toBeUndefined()
    })

    it('should include optional fields when present', () => {
      const row: OrderItemRow = {
        id: 'i1',
        orderId: 'o1',
        productId: 'p1',
        variantId: 'v1',
        name: 'Widget',
        price: 10,
        quantity: 1,
        image: 'https://example.com/img.png',
      }

      const item = toOrderItem(row)

      expect(item.variantId).toBe('v1')
      expect(item.image).toBe('https://example.com/img.png')
    })
  })

  describe('toOrderEvent', () => {
    it('should convert a row to an order event', () => {
      const row: OrderEventRow = {
        id: 'e1',
        orderId: 'o1',
        status: 'pending',
        metadata: null,
        createdAt: '2024-01-01T00:00:00Z',
      }

      const event = toOrderEvent(row)

      expect(event).toEqual({
        id: 'e1',
        orderId: 'o1',
        status: 'pending',
        createdAt: '2024-01-01T00:00:00Z',
      })
      expect(event.metadata).toBeUndefined()
    })

    it('should parse metadata when present', () => {
      const row: OrderEventRow = {
        id: 'e1',
        orderId: 'o1',
        status: 'cancelled',
        metadata: '{"reason":"changed mind"}',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const event = toOrderEvent(row)

      expect(event.metadata).toEqual({ reason: 'changed mind' })
    })

    it('should ignore malformed metadata JSON', () => {
      const row: OrderEventRow = {
        id: 'e1',
        orderId: 'o1',
        status: 'pending',
        metadata: 'not-json',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const event = toOrderEvent(row)

      expect(event.metadata).toBeUndefined()
    })
  })

  describe('computeSubtotal', () => {
    it('should return 0 for empty items', () => {
      expect(computeSubtotal([])).toBe(0)
    })

    it('should sum price * quantity for all items', () => {
      const items = [
        { price: 10, quantity: 2 },
        { price: 5, quantity: 3 },
      ]
      expect(computeSubtotal(items)).toBe(35)
    })
  })

  describe('assembleOrder', () => {
    it('should assemble a complete order from rows', () => {
      const orderRow: OrderRow = {
        id: 'o1',
        userId: 'u1',
        status: 'pending',
        subtotal: 40,
        tax: 4,
        shipping: 5,
        discount: 0,
        total: 49,
        shippingAddress: JSON.stringify({
          line1: '123 Main St',
          city: 'Springfield',
          postalCode: '12345',
          country: 'US',
        }),
        billingAddress: null,
        paymentId: 'pay-1',
        notes: 'Handle with care',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const itemRows: OrderItemRow[] = [
        {
          id: 'i1',
          orderId: 'o1',
          productId: 'p1',
          variantId: null,
          name: 'Widget',
          price: 20,
          quantity: 2,
          image: null,
        },
      ]

      const order = assembleOrder(orderRow, itemRows)

      expect(order.id).toBe('o1')
      expect(order.userId).toBe('u1')
      expect(order.status).toBe('pending')
      expect(order.items).toHaveLength(1)
      expect(order.subtotal).toBe(40)
      expect(order.tax).toBe(4)
      expect(order.shipping).toBe(5)
      expect(order.total).toBe(49)
      expect(order.shippingAddress).toEqual({
        line1: '123 Main St',
        city: 'Springfield',
        postalCode: '12345',
        country: 'US',
      })
      expect(order.billingAddress).toBeUndefined()
      expect(order.paymentId).toBe('pay-1')
      expect(order.notes).toBe('Handle with care')
    })

    it('should assemble order without optional fields', () => {
      const orderRow: OrderRow = {
        id: 'o1',
        userId: 'u1',
        status: 'pending',
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        shippingAddress: null,
        billingAddress: null,
        paymentId: null,
        notes: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const order = assembleOrder(orderRow, [])

      expect(order.shippingAddress).toBeUndefined()
      expect(order.billingAddress).toBeUndefined()
      expect(order.paymentId).toBeUndefined()
      expect(order.notes).toBeUndefined()
      expect(order.items).toEqual([])
    })
  })
})
