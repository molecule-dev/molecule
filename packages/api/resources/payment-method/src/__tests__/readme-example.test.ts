/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the real Stripe payments bond is bonded under
 * the name `stripe` and the handlers (plus the example's attach route) are
 * driven over HTTP. Only the outside world is replaced: the `stripe` SDK by an
 * in-test client, the postgresql driver by an in-test store, and the global
 * auth middleware by a fixed session.
 *
 * @module
 */
const { fakeStore, fakeStripe } = vi.hoisted(() => ({
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
  fakeStripe: {
    customers: { create: vi.fn() },
    setupIntents: { create: vi.fn() },
    paymentMethods: { retrieve: vi.fn(), detach: vi.fn() },
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))
vi.mock('stripe', () => ({
  default: class {
    customers = fakeStripe.customers
    setupIntents = fakeStripe.setupIntents
    paymentMethods = fakeStripe.paymentMethods
  },
}))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { bond } from '@molecule/api-bond'
import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { paymentProvider } from '@molecule/api-payments-stripe'

import { attachPaymentMethod, requestHandlerMap as PaymentMethods } from '../index.js'

process.env.STRIPE_SECRET_KEY = 'test-key'

/** In-test `payment_methods` rows. */
const rows: Record<string, unknown>[] = []

/**
 * Evaluates the equality conditions the service issues against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) => row[w.field] === w.value)
}

fakeStore.findMany.mockImplementation(
  async (_table: string, options?: { where?: WhereCondition[] }) =>
    rows.filter((row) => matches(row, options?.where)),
)
fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
  const row = { id: `pmrow-${rows.length + 1}`, createdAt: '2026-09-24T00:00:00Z', ...data }
  rows.push(row)
  return { data: row, affected: 1 }
})

fakeStripe.customers.create.mockResolvedValue({ id: 'cus_123' })
fakeStripe.setupIntents.create.mockResolvedValue({
  id: 'seti_123',
  client_secret: 'seti_123_secret_abc',
})
fakeStripe.paymentMethods.retrieve.mockResolvedValue({
  id: 'pm_123',
  card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030 },
})

setStore(store)
bond('payments', 'stripe', paymentProvider)

const router = express.Router()
router.post('/me/payment-methods/setup-intent', PaymentMethods.createSetupIntent)
router.get('/me/payment-methods', PaymentMethods.listPaymentMethods)
router.put('/me/payment-methods/:id/default', PaymentMethods.setDefaultPaymentMethod)
router.delete('/me/payment-methods/:id', PaymentMethods.deletePaymentMethod)
router.post('/me/payment-methods', async (req, res) => {
  const userId = res.locals.session?.userId as string | undefined
  if (!userId) return void res.status(401).end()
  const method = await attachPaymentMethod(userId, String(req.body.paymentMethodId))
  res.status(201).json(method)
})

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
  it('creates a SetupIntent, attaches the confirmed card as default and lists it', async () => {
    const intent = await fetch(`${baseUrl}/me/payment-methods/setup-intent`, { method: 'POST' })
    expect(intent.status).toBe(201)
    expect(await intent.json()).toEqual({
      id: 'seti_123',
      clientSecret: 'seti_123_secret_abc',
      customerId: 'cus_123',
      provider: 'stripe',
    })

    const attached = await fetch(`${baseUrl}/me/payment-methods`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: 'pm_123' }),
    })
    expect(attached.status).toBe(201)
    expect(await attached.json()).toMatchObject({
      userId: 'user-123',
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2030,
      isDefault: true,
      providerCustomerId: '',
    })

    const list = await fetch(`${baseUrl}/me/payment-methods`)
    expect(await list.json()).toEqual([
      expect.objectContaining({ providerPaymentMethodId: 'pm_123' }),
    ])
  })
})
