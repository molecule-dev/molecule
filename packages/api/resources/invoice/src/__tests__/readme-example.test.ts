/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the router is mounted on a real Express app and
 * driven over HTTP, and the service calls run against the bonded DataStore. Only
 * the postgresql driver is replaced by an in-test store, and the global auth
 * middleware by a fixed session.
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

import { createInvoiceForUser, createInvoiceRouter, recordPayment } from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/invoices', createInvoiceRouter())

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

/** In-test invoices table keyed by id. */
let rows: Map<string, Record<string, unknown>>

beforeEach(() => {
  vi.clearAllMocks()
  rows = new Map()
  fakeStore.count.mockImplementation(async () => rows.size)
  fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
    const row = {
      id: `inv-${rows.size + 1}`,
      created_at: '2026-09-24T00:00:00.000Z',
      updated_at: '2026-09-24T00:00:00.000Z',
      ...data,
    }
    rows.set(row.id, row)
    return { data: row, affected: 1 }
  })
  fakeStore.findById.mockImplementation(async (_table: string, id: string) => rows.get(id) ?? null)
  fakeStore.updateById.mockImplementation(
    async (_table: string, id: string, data: Record<string, unknown>) => {
      const row = { ...rows.get(id), ...data }
      rows.set(id, row)
      return { data: row, affected: 1 }
    },
  )
})

describe('README @example', () => {
  it('creates a draft invoice with computed totals, then records the full payment', async () => {
    const userId = 'user-123'
    const invoice = await createInvoiceForUser(userId, {
      client_id: 'acme-co',
      items: [{ description: 'Consulting', quantity: 10, unit_price: 250 }],
      tax_rate: 8.5,
    })
    expect(invoice.number).toBe(`INV-${new Date().getFullYear()}-0001`)
    expect(invoice.status).toBe('draft')
    expect(invoice.subtotal).toBe(2500)
    expect(invoice.tax_amount).toBe(212.5)
    expect(invoice.total).toBe(2712.5)

    const paid = await recordPayment(invoice.id, userId, 2712.5)
    expect(paid?.status).toBe('paid')
    expect(paid?.amount_paid).toBe(2712.5)
    expect(paid?.paid_at).toEqual(expect.any(String))
  })

  it('marks an under-payment partial and refuses another user', async () => {
    const invoice = await createInvoiceForUser('user-123', {
      client_id: 'acme-co',
      items: [{ description: 'Consulting', quantity: 10, unit_price: 250 }],
      tax_rate: 8.5,
    })

    expect((await recordPayment(invoice.id, 'user-123', 2710))?.status).toBe('partial')
    expect(await recordPayment(invoice.id, 'someone-else', 10)).toBeNull()
  })

  it('serves the same create through the mounted POST /invoices route', async () => {
    const response = await fetch(`${baseUrl}/invoices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: 'acme-co',
        items: [{ description: 'Consulting', quantity: 10, unit_price: 250 }],
        tax_rate: 8.5,
      }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      user_id: 'user-123',
      status: 'draft',
      total: 2712.5,
    })
  })
})
