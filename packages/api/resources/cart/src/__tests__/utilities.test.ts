import { describe, expect, it } from 'vitest'

import type { AppliedCoupon, CartItemRow, CartRow } from '../types.js'
import {
  assembleCart,
  computeDiscount,
  computeSubtotal,
  computeTax,
  toCartItem,
} from '../utilities.js'

describe('cart utilities', () => {
  describe('toCartItem', () => {
    it('should convert a row to a cart item', () => {
      const row: CartItemRow = {
        id: 'i1',
        cartId: 'c1',
        productId: 'p1',
        variantId: null,
        name: 'Widget',
        price: 10,
        quantity: 2,
        image: null,
        metadata: null,
        createdAt: '2024-01-01T00:00:00Z',
      }

      const item = toCartItem(row)

      expect(item).toEqual({
        id: 'i1',
        productId: 'p1',
        name: 'Widget',
        price: 10,
        quantity: 2,
      })
      expect(item.variantId).toBeUndefined()
      expect(item.image).toBeUndefined()
      expect(item.metadata).toBeUndefined()
    })

    it('should include optional fields when present', () => {
      const row: CartItemRow = {
        id: 'i1',
        cartId: 'c1',
        productId: 'p1',
        variantId: 'v1',
        name: 'Widget',
        price: 10,
        quantity: 1,
        image: 'https://example.com/img.png',
        metadata: '{"color":"red"}',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const item = toCartItem(row)

      expect(item.variantId).toBe('v1')
      expect(item.image).toBe('https://example.com/img.png')
      expect(item.metadata).toEqual({ color: 'red' })
    })

    it('should ignore malformed metadata JSON', () => {
      const row: CartItemRow = {
        id: 'i1',
        cartId: 'c1',
        productId: 'p1',
        variantId: null,
        name: 'Widget',
        price: 10,
        quantity: 1,
        image: null,
        metadata: 'not-json',
        createdAt: '2024-01-01T00:00:00Z',
      }

      const item = toCartItem(row)

      expect(item.metadata).toBeUndefined()
    })
  })

  describe('computeSubtotal', () => {
    it('should return 0 for empty items', () => {
      expect(computeSubtotal([])).toBe(0)
    })

    it('should sum price * quantity for all items', () => {
      const items = [
        { id: '1', productId: 'p1', name: 'A', price: 10, quantity: 2 },
        { id: '2', productId: 'p2', name: 'B', price: 5, quantity: 3 },
      ]
      expect(computeSubtotal(items)).toBe(35)
    })
  })

  describe('computeDiscount', () => {
    it('should return 0 when no coupon', () => {
      expect(computeDiscount(undefined, 100)).toBe(0)
    })

    it('should compute percentage discount', () => {
      const coupon: AppliedCoupon = { code: 'SAVE10', type: 'percentage', value: 10 }
      expect(computeDiscount(coupon, 100)).toBe(10)
    })

    it('should compute fixed discount', () => {
      const coupon: AppliedCoupon = { code: 'FLAT5', type: 'fixed', value: 5 }
      expect(computeDiscount(coupon, 100)).toBe(5)
    })

    it('should clamp discount to subtotal for percentage', () => {
      const coupon: AppliedCoupon = { code: 'ALL', type: 'percentage', value: 150 }
      expect(computeDiscount(coupon, 50)).toBe(50)
    })

    it('should clamp discount to subtotal for fixed', () => {
      const coupon: AppliedCoupon = { code: 'BIG', type: 'fixed', value: 200 }
      expect(computeDiscount(coupon, 50)).toBe(50)
    })
  })

  describe('computeTax', () => {
    it('should return 0 with default 0% rate', () => {
      expect(computeTax(100)).toBe(0)
    })
  })

  describe('assembleCart', () => {
    it('should assemble a complete cart from rows', () => {
      const cartRow: CartRow = {
        id: 'c1',
        userId: 'u1',
        coupon: JSON.stringify({ code: 'SAVE10', type: 'percentage', value: 10 }),
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }
      const itemRows: CartItemRow[] = [
        {
          id: 'i1',
          cartId: 'c1',
          productId: 'p1',
          variantId: null,
          name: 'Widget',
          price: 20,
          quantity: 2,
          image: null,
          metadata: null,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      const cart = assembleCart(cartRow, itemRows)

      expect(cart.id).toBe('c1')
      expect(cart.userId).toBe('u1')
      expect(cart.items).toHaveLength(1)
      expect(cart.subtotal).toBe(40)
      expect(cart.discount).toBe(4)
      expect(cart.tax).toBe(0)
      expect(cart.total).toBe(36)
      expect(cart.coupon).toEqual({ code: 'SAVE10', type: 'percentage', value: 10 })
    })

    it('should assemble cart without coupon', () => {
      const cartRow: CartRow = {
        id: 'c1',
        userId: 'u1',
        coupon: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const cart = assembleCart(cartRow, [])

      expect(cart.coupon).toBeUndefined()
      expect(cart.discount).toBe(0)
      expect(cart.subtotal).toBe(0)
      expect(cart.total).toBe(0)
    })
  })
})
