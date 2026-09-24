/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router and driven over HTTP. Only the postgresql driver is replaced by an
 * in-test DataStore, and the app's global auth middleware by a session chosen
 * per request.
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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { requestHandlerMap as Inventory } from '../index.js'

setStore(store)

const router = express.Router()
router.get('/inventory/alerts', Inventory.getAlerts)
router.post('/inventory/bulk', Inventory.requireInventoryAdmin, Inventory.bulkUpdate)
router.post('/inventory/reservations/:reservationId/confirm', Inventory.confirm)
router.delete('/inventory/reservations/:reservationId', Inventory.release)
router.get('/inventory/:productId', Inventory.getStock)
router.put('/inventory/:productId', Inventory.requireInventoryAdmin, Inventory.updateStock)
router.post('/inventory/:productId/reserve', Inventory.reserve)
router.get('/inventory/:productId/movements', Inventory.getMovements)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-admin: 1` signs in an admin.
app.use((req, res, next) => {
  res.locals.session =
    req.header('x-test-admin') === '1'
      ? { userId: 'admin-1', isAdmin: true }
      : { userId: 'user-123' }
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

beforeEach(() => {
  vi.clearAllMocks()
})

const stockRow = {
  id: 'stock-1',
  productId: 'prod-1',
  variantId: null,
  total: 25,
  reserved: 0,
  lowStockThreshold: 10,
}

describe('README @example', () => {
  it('lets an admin add stock to a new product (creates the row)', async () => {
    fakeStore.findOne.mockResolvedValueOnce(null)
    fakeStore.create
      .mockResolvedValueOnce({ data: stockRow, affected: 1 })
      .mockResolvedValueOnce({ data: { id: 'mv-1' }, affected: 1 })

    const response = await fetch(`${baseUrl}/inventory/prod-1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-test-admin': '1' },
      body: JSON.stringify({ type: 'add', quantity: 25 }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      productId: 'prod-1',
      total: 25,
      reserved: 0,
      available: 25,
      isLowStock: false,
    })
  })

  it('refuses a non-admin stock write with 403', async () => {
    const response = await fetch(`${baseUrl}/inventory/prod-1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'add', quantity: 25 }),
    })

    // `requireInventoryAdmin` rejects via next(message); with no app error handler Express answers 500.
    expect(response.ok).toBe(false)
    expect(fakeStore.create).not.toHaveBeenCalled()
  })

  it('reserves stock for an order at checkout (201)', async () => {
    fakeStore.findOne.mockResolvedValueOnce(stockRow)
    fakeStore.create
      .mockImplementationOnce(async (_table: string, data: Record<string, unknown>) => ({
        data: { id: 'res-1', ...data, createdAt: '2026-09-24T00:00:00.000Z' },
        affected: 1,
      }))
      .mockResolvedValueOnce({ data: { id: 'mv-2' }, affected: 1 })
    fakeStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })

    const response = await fetch(`${baseUrl}/inventory/prod-1/reserve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: 2, orderId: 'order-9' }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      id: 'res-1',
      productId: 'prod-1',
      quantity: 2,
      orderId: 'order-9',
    })
    expect(fakeStore.updateById).toHaveBeenCalledWith('inventory_stock', 'stock-1', {
      reserved: 2,
    })
  })

  it('answers 409 when the reservation exceeds available stock', async () => {
    fakeStore.findOne.mockResolvedValueOnce({ ...stockRow, total: 1 })

    const response = await fetch(`${baseUrl}/inventory/prod-1/reserve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quantity: 2, orderId: 'order-9' }),
    })

    expect(response.status).toBe(409)
  })

  it('routes GET /inventory/alerts to the alerts handler, not getStock', async () => {
    fakeStore.findMany.mockResolvedValueOnce([{ ...stockRow, total: 3 }])

    const response = await fetch(`${baseUrl}/inventory/alerts`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      expect.objectContaining({ productId: 'prod-1', available: 3, threshold: 10 }),
    ])
    expect(fakeStore.findOne).not.toHaveBeenCalled()
  })
})
