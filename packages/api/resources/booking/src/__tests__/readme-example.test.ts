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

import { requestHandlerMap as Booking } from '../index.js'

setStore(store)

const router = express.Router()
router.get('/bookings/availability/:resourceType/:resourceId', Booking.checkAvailability)
router.post('/bookings', Booking.book)
router.get('/bookings', Booking.getBookings)
router.get('/bookings/:id', Booking.getById)
router.post('/bookings/:id/cancel', Booking.cancel)
router.put('/bookings/:id/reschedule', Booking.reschedule)
router.post('/bookings/:id/confirm', Booking.confirm)
router.post('/bookings/:id/complete', Booking.complete)

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
  it('POST /bookings creates a pending booking for the session user with a computed endTime', async () => {
    fakeStore.findMany.mockResolvedValueOnce([]) // no overlapping bookings
    fakeStore.create.mockImplementationOnce(
      async (_table: string, data: Record<string, unknown>) => ({
        data: {
          id: 'bk-1',
          ...data,
          createdAt: '2026-09-24T00:00:00.000Z',
          updatedAt: '2026-09-24T00:00:00.000Z',
        },
        affected: 1,
      }),
    )

    const response = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        resourceType: 'room',
        resourceId: 'room-7',
        startTime: '2026-10-01T09:00:00.000Z',
        duration: 60,
      }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      id: 'bk-1',
      userId: 'user-123',
      status: 'pending',
      startTime: '2026-10-01T09:00:00.000Z',
      endTime: '2026-10-01T10:00:00.000Z',
      duration: 60,
    })
  })

  it('answers 409 when the slot is taken', async () => {
    fakeStore.findMany.mockResolvedValueOnce([{ id: 'bk-0', status: 'confirmed' }])

    const response = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        resourceType: 'room',
        resourceId: 'room-7',
        startTime: '2026-10-01T09:00:00.000Z',
        duration: 60,
      }),
    })

    expect(response.status).toBe(409)
  })
})
