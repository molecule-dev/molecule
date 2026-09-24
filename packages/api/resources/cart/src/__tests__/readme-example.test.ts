/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router and driven over HTTP. Only the postgresql driver is replaced by an
 * in-test DataStore, and the app's global auth middleware by a fixed session.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { requestHandlerMap as Cart } from '../index.js'

setStore(store)

const router = express.Router()
router.get('/cart', Cart.getCart)
router.post('/cart/items', Cart.addItem)
router.put('/cart/items/:itemId', Cart.updateQuantity)
router.delete('/cart/items/:itemId', Cart.removeItem)
router.delete('/cart', Cart.clearCart)
router.post('/cart/coupon', Cart.applyCoupon)
router.delete('/cart/coupon', Cart.removeCoupon)
router.get('/cart/summary', Cart.getCartSummary)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use(router)

let baseUrl = ''
let server: Server

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

describe('README @example', () => {
  it('POST /cart/items adds to the session user’s cart and returns the whole cart', async () => {
    const cartRow = {
      id: 'cart-1',
      userId: 'user-123',
      coupon: null,
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
    }
    const itemRow = {
      id: 'item-1',
      cartId: 'cart-1',
      productId: 'sku-1',
      variantId: null,
      name: 'Mug',
      price: 1200,
      quantity: 2,
      image: null,
      metadata: null,
      createdAt: '2026-09-24T00:00:00.000Z',
    }
    fakeStore.findOne
      .mockResolvedValueOnce(null) // no cart yet
      .mockResolvedValueOnce(null) // item not in cart yet
      .mockResolvedValueOnce(cartRow) // re-read after update
    fakeStore.create
      .mockResolvedValueOnce({ data: cartRow, affected: 1 })
      .mockResolvedValueOnce({ data: itemRow, affected: 1 })
    fakeStore.updateById.mockResolvedValueOnce({ data: cartRow, affected: 1 })
    fakeStore.findMany.mockResolvedValueOnce([itemRow])

    const response = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'sku-1', name: 'Mug', price: 1200, quantity: 2 }),
    })

    expect(response.status).toBe(201)
    const cart = (await response.json()) as Record<string, unknown>
    expect(cart).toMatchObject({
      id: 'cart-1',
      userId: 'user-123',
      subtotal: 2400,
      discount: 0,
      tax: 0,
      total: 2400,
    })
    expect(fakeStore.create).toHaveBeenNthCalledWith(1, 'carts', { userId: 'user-123' })
  })
})
