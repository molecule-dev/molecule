/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store, and
 * the handlers are mounted on an Express router behind a fixed session.
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

import {
  isEnabled,
  requestHandlerMap as NotificationPreferences,
  updatePreferences,
} from '../index.js'

setStore(store)

const router = express.Router()
router.get('/me/notification-preferences', NotificationPreferences.getPreferences)
router.put('/me/notification-preferences', NotificationPreferences.updatePreferences)

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

/** In-test `notifications_preferences` rows keyed by userId. */
let rows: Map<string, Record<string, unknown>>

beforeEach(() => {
  rows = new Map()
  fakeStore.findOne.mockImplementation(
    async (_table: string, where: WhereCondition[]) => rows.get(String(where[0]?.value)) ?? null,
  )
  fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
    rows.set(String(data.userId), data)
    return { data, affected: 1 }
  })
  fakeStore.updateMany.mockImplementation(
    async (_table: string, where: WhereCondition[], data: Record<string, unknown>) => {
      const key = String(where[0]?.value)
      rows.set(key, { ...rows.get(key), ...data })
      return { data: null, affected: 1 }
    },
  )
})

describe('README @example', () => {
  it('stores an opt-out and gates only that channel', async () => {
    const userId = 'user-123'
    expect(await isEnabled(userId, 'order.shipped', 'email')).toBe(true) // default-on

    await updatePreferences(userId, { 'order.shipped': { email: false } })

    expect(await isEnabled(userId, 'order.shipped', 'email')).toBe(false)
    expect(await isEnabled(userId, 'order.shipped', 'push')).toBe(true)
    expect(await isEnabled(userId, 'order.delivered', 'email')).toBe(true)
  })

  it('serves the same update over PUT and reads it back wrapped in { preferences }', async () => {
    const put = await fetch(`${baseUrl}/me/notification-preferences`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 'order.shipped': { email: false } }),
    })
    expect(put.status).toBe(200)

    const get = await fetch(`${baseUrl}/me/notification-preferences`)
    expect(await get.json()).toEqual({
      preferences: { 'order.shipped': { email: false, push: true, sms: true, inApp: true } },
    })

    const bad = await fetch(`${baseUrl}/me/notification-preferences`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ 'order.shipped': { email: 'no' } }),
    })
    expect(bad.status).toBe(400)
  })
})
