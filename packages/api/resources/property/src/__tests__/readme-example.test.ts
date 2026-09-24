/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router and driven over HTTP. Only the postgresql driver is replaced by an
 * in-test store, and the app's global auth middleware by a session chosen per
 * request (`x-test-user: anon` means no session).
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

import { requestHandlerMap as Property } from '../index.js'

setStore(store)

const router = express.Router()
router.post('/properties', Property.create)
router.get('/properties', Property.list)
router.get('/properties/:id', Property.read)
router.patch('/properties/:id', Property.update)
router.delete('/properties/:id', Property.del)
router.get('/properties/:id/units', Property.listUnits)
router.post('/properties/:id/units', Property.createUnit)
router.get('/properties/:id/photos', Property.listPhotos)
router.post('/properties/:id/photos', Property.createPhoto)
router.get('/properties/:id/amenities', Property.listAmenities)
router.post('/properties/:id/amenities', Property.createAmenity)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware.
app.use((req, res, next) => {
  const user = req.header('x-test-user') ?? 'owner-1'
  if (user !== 'anon') res.locals.session = { userId: user }
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

/** In-test `properties` rows keyed by id. */
const rows = new Map<string, Record<string, unknown>>()

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
    [...rows.values()].find((row) => matches(row, where)) ?? null,
)
fakeStore.findById.mockImplementation(async (_table: string, id: string) => rows.get(id) ?? null)
fakeStore.findMany.mockImplementation(
  async (_table: string, options?: { where?: WhereCondition[] }) =>
    [...rows.values()].filter((row) => matches(row, options?.where)),
)
fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
  const row = { id: `prop-${rows.size + 1}`, deletedAt: null, ...data }
  rows.set(row.id, row)
  return { data: row, affected: 1 }
})
fakeStore.updateById.mockImplementation(
  async (_table: string, id: string, data: Record<string, unknown>) => {
    const row = { ...rows.get(id), ...data }
    rows.set(id, row)
    return { data: row, affected: 1 }
  },
)

describe('README @example', () => {
  it('creates a draft listing that becomes public only once the owner activates it', async () => {
    const created = await fetch(`${baseUrl}/properties`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Harbour View',
        addressLine1: '1 Quay St',
        city: 'Lisbon',
        countryCode: 'pt',
      }),
    })
    expect(created.status).toBe(201)
    const property = (await created.json()) as { id: string }
    expect(property).toMatchObject({
      ownerId: 'owner-1',
      slug: 'harbour-view',
      status: 'draft',
      type: 'apartment',
      countryCode: 'PT',
    })

    const before = await fetch(`${baseUrl}/properties`, { headers: { 'x-test-user': 'anon' } })
    expect(await before.json()).toEqual({ data: [], page: 1, perPage: 20 })

    const stranger = await fetch(`${baseUrl}/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-test-user': 'someone-else' },
      body: JSON.stringify({ status: 'active' }),
    })
    expect(stranger.status).toBe(403)

    const activated = await fetch(`${baseUrl}/properties/${property.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    })
    expect(activated.status).toBe(200)

    const after = await fetch(`${baseUrl}/properties`, { headers: { 'x-test-user': 'anon' } })
    expect(await after.json()).toEqual({
      data: [expect.objectContaining({ id: property.id, status: 'active' })],
      page: 1,
      perPage: 20,
    })
  })
})
