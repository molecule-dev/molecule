/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the router is mounted on a real Express app and
 * driven over HTTP. Only the postgresql driver is replaced by an in-test store,
 * and the global auth middleware by a fixed session.
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

import {
  createEventTypeForOwner,
  createEventTypeRouter,
  generateSlots,
  setAvailabilityRulesForUser,
} from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/event-types', createEventTypeRouter())

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

const rule = {
  id: 'rule-1',
  user_id: 'user-123',
  day_of_week: 1,
  start_minute: 540,
  end_minute: 1020,
  timezone: 'America/New_York',
  created_at: '2026-09-24T00:00:00.000Z',
}
const eventType = {
  id: 'et-1',
  owner_id: 'user-123',
  name: '30-min consult',
  slug: '30-min-consult',
  description: null,
  duration_minutes: 30,
  location_kind: 'video',
  location_value: null,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  min_notice_minutes: 240,
  max_per_day: null,
  requires_confirmation: false,
  color: null,
  is_active: true,
  position: 0,
  created_at: '2026-09-24T00:00:00.000Z',
  updated_at: '2026-09-24T00:00:00.000Z',
}

describe('README @example', () => {
  it('replaces the owner rules, creates an event type and generates the Monday slots', async () => {
    fakeStore.findMany
      .mockResolvedValueOnce([{ ...rule, id: 'old-rule' }]) // existing rules
      .mockResolvedValueOnce([rule]) // after replace
    fakeStore.deleteById.mockResolvedValueOnce({ data: null, affected: 1 })
    fakeStore.create
      .mockResolvedValueOnce({ data: rule, affected: 1 })
      .mockResolvedValueOnce({ data: eventType, affected: 1 })

    const ownerId = 'user-123'
    const rules = await setAvailabilityRulesForUser(ownerId, [
      { day_of_week: 1, start_minute: 540, end_minute: 1020, timezone: 'America/New_York' },
    ])
    expect(fakeStore.deleteById).toHaveBeenCalledWith('availability_rules', 'old-rule')

    const consult = await createEventTypeForOwner(ownerId, {
      name: '30-min consult',
      slug: '30-min-consult',
      duration_minutes: 30,
    })
    expect(fakeStore.create).toHaveBeenLastCalledWith(
      'event_types',
      expect.objectContaining({ owner_id: 'user-123', slug: '30-min-consult', is_active: true }),
    )

    const slots = generateSlots({
      date: '2026-06-15',
      durationMinutes: consult.duration_minutes,
      rules,
    })
    expect(slots).toHaveLength(16)
    expect(slots[0]).toEqual({
      start: '2026-06-15T09:00:00.000Z',
      end: '2026-06-15T09:30:00.000Z',
      available: true,
    })
  })

  it('serves the same slots from the mounted public availability route', async () => {
    fakeStore.findOne.mockResolvedValueOnce(eventType)
    fakeStore.findMany.mockResolvedValueOnce([rule])

    const response = await fetch(
      `${baseUrl}/event-types/by-slug/30-min-consult/availability?date=2026-06-15`,
    )

    expect(response.status).toBe(200)
    const body = (await response.json()) as { slots: unknown[]; duration_minutes: number }
    expect(body.duration_minutes).toBe(30)
    expect(body.slots).toHaveLength(16)
  })
})
