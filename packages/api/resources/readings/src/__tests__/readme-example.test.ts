/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore and raw pool are bonded through
 * the real `setStore`/`setPool`, with only the postgresql driver replaced by
 * in-test doubles, and the router is driven over HTTP behind a fixed session.
 *
 * @module
 */
const { fakeStore, fakePool } = vi.hoisted(() => ({
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
  fakePool: {
    query: vi.fn(),
    connect: vi.fn(),
    end: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore, pool: fakePool }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setPool, setStore, type WhereCondition } from '@molecule/api-database'
import { pool, store } from '@molecule/api-database-postgresql'

import {
  createReadingsRouter,
  ingestReading,
  listAggregatedReadings,
  listRawReadings,
} from '../index.js'

setPool(pool)
setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/readings', createReadingsRouter())

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

/** In-test `readings` rows. */
let rows: Record<string, unknown>[]

beforeEach(() => {
  rows = []
  fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
    const row = { id: `rd-${rows.length + 1}`, ...data }
    rows.push(row)
    return { data: row, affected: 1 }
  })
  fakeStore.findMany.mockImplementation(
    async (_table: string, options?: { where?: WhereCondition[] }) =>
      rows
        .filter((row) => (options?.where ?? []).every((w) => row[w.field] === w.value))
        .sort((a, b) => String(a.recorded_at).localeCompare(String(b.recorded_at))),
  )
  // What PostgreSQL's GROUP BY returns for the two readings above (numerics arrive as strings).
  fakePool.query.mockResolvedValue({
    rows: [
      {
        bucket_at: new Date('2026-09-24T10:00:00Z'),
        metric: 'kwh',
        sensor_id: 'meter-1',
        min: '1.4',
        max: '1.6',
        avg: '1.5',
        sum: '3',
        count: '2',
      },
    ],
    rowCount: 1,
  })
})

describe('README @example', () => {
  it('ingests two readings, lists them oldest first and rolls them up by hour', async () => {
    const userId = 'user-123'
    await ingestReading(userId, {
      sensor_id: 'meter-1',
      metric: 'kwh',
      value: 1.6,
      unit: 'kWh',
      recorded_at: '2026-09-24T10:35:00Z',
    })
    await ingestReading(userId, {
      sensor_id: 'meter-1',
      metric: 'kwh',
      value: 1.4,
      unit: 'kWh',
      recorded_at: '2026-09-24T10:05:00Z',
    })

    const raw = await listRawReadings(userId, { sensor_id: 'meter-1' })
    expect(raw.map((r) => r.value)).toEqual([1.4, 1.6])

    const hourly = await listAggregatedReadings(userId, { granularity: 'hour', metric: 'kwh' })
    expect(hourly).toEqual([
      {
        bucket_at: '2026-09-24T10:00:00.000Z',
        metric: 'kwh',
        sensor_id: 'meter-1',
        min: 1.4,
        max: 1.6,
        avg: 1.5,
        sum: 3,
        count: 2,
      },
    ])
    const [sql, params] = fakePool.query.mock.calls[0] ?? []
    expect(String(sql)).toContain("date_trunc('hour', recorded_at)")
    expect(params).toEqual(['user-123', 'kwh'])
  })

  it('serves ingest and the raw query over the mounted router, scoped to the session', async () => {
    const created = await fetch(`${baseUrl}/readings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sensor_id: 'meter-1', metric: 'kwh', value: 1.4 }),
    })
    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({ owner_id: 'user-123', value: 1.4 })

    const bad = await fetch(`${baseUrl}/readings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sensor_id: 'meter-1', metric: 'kwh', value: 'high' }),
    })
    expect(bad.status).toBe(400)

    const list = await fetch(`${baseUrl}/readings?granularity=raw`)
    expect(await list.json()).toEqual([
      expect.objectContaining({ sensor_id: 'meter-1', value: 1.4 }),
    ])
  })
})
