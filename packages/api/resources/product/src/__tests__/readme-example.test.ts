/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router with their `requireAdmin` gates and driven over HTTP. Only the
 * postgresql driver is replaced by an in-test store, and the app's global auth
 * middleware by a session chosen per request.
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

import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { requestHandlerMap as Product } from '../index.js'

setStore(store)

const router = express.Router()
router.post('/products', Product.requireAdmin, Product.create)
router.get('/products', Product.list)
router.get('/products/:id', Product.read)
router.patch('/products/:id', Product.requireAdmin, Product.update)
router.delete('/products/:id', Product.requireAdmin, Product.del)
router.get('/products/:id/variants', Product.listVariants)
router.post('/products/:id/variants', Product.requireAdmin, Product.createVariant)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-admin: 1` signs in an admin.
app.use((req, res, next) => {
  res.locals.session =
    req.header('x-test-admin') === '1'
      ? { userId: 'admin-1', isAdmin: true }
      : { userId: 'shopper-1' }
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

/** In-test `products` rows. */
const rows: Record<string, unknown>[] = []

/**
 * Evaluates the `=` and `is_null` conditions the handlers issue against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) =>
    w.operator === 'is_null' ? row[w.field] == null : row[w.field] === w.value,
  )
}

fakeStore.findOne.mockImplementation(
  async (_table: string, where: WhereCondition[]) =>
    rows.find((row) => matches(row, where)) ?? null,
)
fakeStore.findMany.mockImplementation(
  async (_table: string, options?: { where?: WhereCondition[] }) =>
    rows.filter((row) => matches(row, options?.where)),
)
fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
  const row = { id: `prod-${rows.length + 1}`, deletedAt: null, ...data }
  rows.push(row)
  return { data: row, affected: 1 }
})

describe('README @example', () => {
  it('lets an admin create an active product that the storefront lists', async () => {
    const created = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-admin': '1' },
      body: JSON.stringify({ name: 'Ceramic Mug', price: 1200, status: 'active' }),
    })
    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({
      slug: 'ceramic-mug',
      price: 1200,
      currency: 'USD',
      status: 'active',
    })

    // A draft created without `status` shows up in an unfiltered list, but not ?status=active.
    await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-admin': '1' },
      body: JSON.stringify({ name: 'Secret Mug', price: 900 }),
    })
    const all = (await (await fetch(`${baseUrl}/products`)).json()) as { data: unknown[] }
    expect(all.data).toHaveLength(2)

    const storefront = await fetch(`${baseUrl}/products?status=active`)
    expect(await storefront.json()).toEqual({
      data: [expect.objectContaining({ name: 'Ceramic Mug' })],
      page: 1,
      perPage: 20,
    })
  })

  it('refuses a non-admin create before anything is written', async () => {
    fakeStore.create.mockClear()
    const response = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Hack', price: 0 }),
    })
    // `requireAdmin` rejects via next(message); with no app error handler Express answers 500.
    expect(response.ok).toBe(false)
    expect(fakeStore.create).not.toHaveBeenCalled()
  })
})
