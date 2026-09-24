/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-test store, and
 * the router is driven over HTTP behind a fixed session.
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
  adherenceRate,
  createMedicationForOwner,
  createMedicationRouter,
  logDose,
} from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/medications', createMedicationRouter())

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
 * Evaluates the `=`, `>=` and `<=` conditions the service issues against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) => {
    const value = row[w.field] as string
    if (w.operator === '>=') return value >= (w.value as string)
    if (w.operator === '<=') return value <= (w.value as string)
    return value === w.value
  })
}

beforeEach(() => {
  tables = new Map()
  fakeStore.create.mockImplementation(async (name: string, data: Record<string, unknown>) => {
    const row = { id: `${name}-${table(name).size + 1}`, ...data }
    table(name).set(row.id, row)
    return { data: row, affected: 1 }
  })
  fakeStore.findById.mockImplementation(
    async (name: string, id: string) => table(name).get(id) ?? null,
  )
  fakeStore.count.mockImplementation(
    async (name: string, where?: WhereCondition[]) =>
      [...table(name).values()].filter((row) => matches(row, where)).length,
  )
})

describe('README @example', () => {
  it('creates a medication, logs two doses and reports adherence as a fraction', async () => {
    const userId = 'user-123'
    const med = await createMedicationForOwner(userId, {
      name: 'Metformin',
      dosage: '500 mg',
      frequency: 'twice_daily',
      times_of_day: ['08:00', '20:00'],
    })
    expect(med).toMatchObject({ owner_id: 'user-123', is_active: true, frequency: 'twice_daily' })

    await logDose(med.id, userId, { status: 'taken', taken_at: '2026-01-15T08:05:00.000Z' })
    await logDose(med.id, userId, { status: 'skipped', taken_at: '2026-01-15T20:00:00.000Z' })

    expect(await adherenceRate(userId, '2026-01-01', '2026-01-31')).toEqual({
      taken: 1,
      total: 2,
      rate: 0.5,
    })
    // Another user cannot log against this medication.
    expect(await logDose(med.id, 'someone-else', {})).toBeNull()
  })

  it('serves the same create through the mounted POST /medications route', async () => {
    const response = await fetch(`${baseUrl}/medications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Metformin', dosage: '500 mg', frequency: 'twice_daily' }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ owner_id: 'user-123', name: 'Metformin' })
  })
})
