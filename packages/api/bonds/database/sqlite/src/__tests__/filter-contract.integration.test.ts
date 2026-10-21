/**
 * REAL-DEPENDENCY integration test — the real SQLite pool and store over a
 * temp database, no mocks.
 *
 * m355 (`xr-molecule-flash-m355`, 2026-10-21): a seed helper called
 * `findMany('users', [{ field: 'username', operator: '=', value }])`. The
 * condition array was read as "no options", `options.where` was `undefined`,
 * and every lookup returned EVERY user — so the seed created only the first
 * ('jake') and the rest of the data came out wrong. Nothing threw, because the
 * caller ran through `tsx` (no type-check).
 *
 * The contract pinned here: `findMany` takes `{ where: [...] }`; `findOne`,
 * `count`, `updateMany` and `deleteMany` take the condition array itself; any
 * other shape throws an actionable `TypeError` BEFORE a query is built, so a
 * filter can never be silently dropped. The valid empty/undefined/options forms
 * keep their documented behavior against a real database.
 *
 * @module
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { DatabasePool, DataStore } from '@molecule/api-database'

import { createPool } from '../pool.js'
import { createStore } from '../store.js'

const CONDITION = { field: 'username', operator: '=', value: 'zzz' } as const

let workDir: string
let pool: DatabasePool
let store: DataStore

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-filter-contract-'))
  pool = createPool({ path: join(workDir, 'app.db') })
  store = createStore(pool)

  await pool.query(
    `CREATE TABLE "users" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT NOT NULL,
      "active" INTEGER NOT NULL DEFAULT 1
    )`,
  )
  await pool.query(`INSERT INTO "users" ("id", "username", "active") VALUES (?, ?, ?)`, [
    'u1',
    'jake',
    1,
  ])
  await pool.query(`INSERT INTO "users" ("id", "username", "active") VALUES (?, ?, ?)`, [
    'u2',
    'zzz',
    1,
  ])
})

afterAll(async () => {
  await pool.end()
  rmSync(workDir, { recursive: true, force: true })
})

describe('findMany argument shape × REAL SQLite', () => {
  it('rejects a bare condition array instead of returning every row (m355)', async () => {
    await expect(store.findMany('users', [CONDITION] as never)).rejects.toBeInstanceOf(TypeError)
    await expect(store.findMany('users', [CONDITION] as never)).rejects.toThrow(
      /bare condition array/,
    )

    // The precondition: the table really does hold a non-matching row, so a
    // silently-unfiltered read WOULD have returned 2.
    expect(await store.count('users')).toBe(2)
  })

  it('rejects a single condition object and a key map', async () => {
    await expect(store.findMany('users', CONDITION as never)).rejects.toBeInstanceOf(TypeError)
    await expect(store.findMany('users', { username: 'zzz' } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
  })

  it('rejects options.where that is not an array', async () => {
    await expect(store.findMany('users', { where: CONDITION } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    await expect(store.findMany('users', { where: null } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
  })

  it('keeps the documented valid forms: omitted, undefined, {}, { where: [] }', async () => {
    expect(await store.findMany('users')).toHaveLength(2)
    expect(await store.findMany('users', undefined)).toHaveLength(2)
    expect(await store.findMany('users', {})).toHaveLength(2)
    expect(await store.findMany('users', { where: [] })).toHaveLength(2)
  })

  it('filters normally with { where: [...] } — including no match', async () => {
    expect(await store.findMany('users', { where: [CONDITION] })).toHaveLength(1)
    expect(
      await store.findMany('users', {
        where: [{ field: 'username', operator: '=', value: 'nobody' }],
      }),
    ).toHaveLength(0)
  })
})

describe('findOne / count argument shape × REAL SQLite', () => {
  it('findOne rejects a { where: [...] } options object', async () => {
    await expect(store.findOne('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    await expect(store.findOne('users', { where: [CONDITION] } as never)).rejects.toThrow(
      /findMany options shape/,
    )
  })

  it('findOne keeps its documented forms: [] and a condition array', async () => {
    expect(await store.findOne('users', [])).not.toBeNull()
    const jake = await store.findOne<{ username: string }>('users', [
      { field: 'username', operator: '=', value: 'jake' },
    ])
    expect(jake?.username).toBe('jake')
  })

  it('count rejects a { where: [...] } options object and an undefined-only rule holds', async () => {
    await expect(store.count('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )

    expect(await store.count('users')).toBe(2)
    expect(await store.count('users', undefined)).toBe(2)
    expect(await store.count('users', [])).toBe(2)
    expect(await store.count('users', [CONDITION])).toBe(1)
  })
})

describe('malformed conditions cannot broaden updates or deletes × REAL SQLite', () => {
  it('updateMany rejects a malformed where and leaves every row untouched', async () => {
    await expect(
      store.updateMany('users', { where: [CONDITION] } as never, { active: 0 }),
    ).rejects.toBeInstanceOf(TypeError)
    await expect(
      store.updateMany('users', undefined as never, { active: 0 }),
    ).rejects.toBeInstanceOf(TypeError)

    expect(await store.count('users', [{ field: 'active', operator: '=', value: 0 }])).toBe(0)
  })

  it('deleteMany rejects a malformed where and leaves every row in place', async () => {
    await expect(store.deleteMany('users', { where: [CONDITION] } as never)).rejects.toBeInstanceOf(
      TypeError,
    )
    await expect(store.deleteMany('users', undefined as never)).rejects.toBeInstanceOf(TypeError)

    expect(await store.count('users')).toBe(2)
  })

  it('updateMany / deleteMany still narrow to their condition array', async () => {
    await store.updateMany('users', [{ field: 'username', operator: '=', value: 'jake' }], {
      active: 0,
    })
    expect(await store.count('users', [{ field: 'active', operator: '=', value: 0 }])).toBe(1)

    await store.deleteMany('users', [{ field: 'username', operator: '=', value: 'zzz' }])
    expect(await store.count('users')).toBe(1)
  })
})
