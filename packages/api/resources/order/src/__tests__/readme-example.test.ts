/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router with the merchant authorizer registered, and driven over HTTP. Only
 * the postgresql driver is replaced by an in-test store, and the app's global
 * auth middleware by a session chosen per request.
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

import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { requestHandlerMap as Order, setOrderMerchantAuthorizer } from '../index.js'

setStore(store)
const merchantIds = new Set(['merchant-1'])
setOrderMerchantAuthorizer((_order, userId) => merchantIds.has(userId))

const router = express.Router()
router.post('/orders', Order.create)
router.get('/orders', Order.list)
router.get('/orders/:id', Order.read)
router.put('/orders/:id/status', Order.updateStatus)
router.post('/orders/:id/cancel', Order.cancel)
router.post('/orders/:id/refund', Order.refund)
router.get('/orders/:id/history', Order.getHistory)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-user` picks the session user.
app.use((req, res, next) => {
  res.locals.session = { userId: req.header('x-test-user') ?? 'buyer-1' }
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

/** In-test tables keyed by table name then id. */
let tables: Map<string, Map<string, Record<string, unknown>>>

/**
 * Returns (creating on first use) the in-test table with the given name.
 *
 * @param name - Table name.
 * @returns The table's rows keyed by id.
 */
function table(name: string): Map<string, Record<string, unknown>> {
  const existing = tables.get(name)
  if (existing) return existing
  const created = new Map<string, Record<string, unknown>>()
  tables.set(name, created)
  return created
}

/**
 * Evaluates the equality conditions the handlers issue against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) => row[w.field] === w.value)
}

/**
 * Creates an order as the buyer through `POST /orders`.
 *
 * @returns The HTTP response.
 */
function postOrder(): Promise<Response> {
  return fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: 'prod-1', name: 'Mug', price: 1200, quantity: 2 }],
      shipping: 500,
    }),
  })
}

beforeEach(() => {
  tables = new Map()
  fakeStore.create.mockImplementation(async (name: string, data: Record<string, unknown>) => {
    const row = {
      id: `${name}-${table(name).size + 1}`,
      createdAt: '2026-09-24T00:00:00Z',
      ...data,
    }
    table(name).set(row.id, row)
    return { data: row, affected: 1 }
  })
  fakeStore.findById.mockImplementation(
    async (name: string, id: string) => table(name).get(id) ?? null,
  )
  fakeStore.findOne.mockImplementation(
    async (name: string, where: WhereCondition[]) =>
      [...table(name).values()].find((row) => matches(row, where)) ?? null,
  )
  fakeStore.findMany.mockImplementation(
    async (name: string, options?: { where?: WhereCondition[] }) =>
      [...table(name).values()].filter((row) => matches(row, options?.where)),
  )
  fakeStore.updateById.mockImplementation(
    async (name: string, id: string, data: Record<string, unknown>) => {
      const row = { ...table(name).get(id), ...data }
      table(name).set(id, row)
      return { data: row, affected: 1 }
    },
  )
})

describe('README @example', () => {
  it('creates a pending order with totals, then only the merchant can confirm it', async () => {
    // A `products` catalog exists and prices prod-1 at 1200.
    table('products').set('prod-1', { id: 'prod-1', price: 1200, deletedAt: null })

    const created = await postOrder()
    expect(created.status).toBe(201)
    const order = (await created.json()) as { id: string }
    expect(order).toMatchObject({ status: 'pending', subtotal: 2400, total: 2900 })

    const byBuyer = await fetch(`${baseUrl}/orders/${order.id}/status`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    expect(byBuyer.status).toBe(403)

    const byMerchant = await fetch(`${baseUrl}/orders/${order.id}/status`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-test-user': 'merchant-1' },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    expect(byMerchant.status).toBe(200)
    expect(await byMerchant.json()).toMatchObject({ id: order.id, status: 'confirmed' })
  })

  it('re-prices items from the catalog instead of trusting the client price', async () => {
    table('products').set('prod-1', { id: 'prod-1', price: 1500, deletedAt: null })

    const created = await postOrder()
    expect(await created.json()).toMatchObject({ subtotal: 3000, total: 3500 })
  })
})
