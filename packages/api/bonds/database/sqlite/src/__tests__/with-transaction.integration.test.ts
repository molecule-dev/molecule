/**
 * `withTransaction()` from `@molecule/api-database` against the real
 * better-sqlite3 connection: the CRUD helpers called inside it join the
 * transaction instead of waiting behind it (they used to wait forever: X1 run
 * sol-m06 lost ~8 min to a registration request that never answered).
 *
 * @module
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  count,
  create,
  type DatabasePool,
  findMany,
  query,
  setPool,
  setStore,
  withTransaction,
} from '@molecule/api-database'

import { createPool } from '../pool.js'
import { createStore } from '../store.js'

let workDir: string
let pool: DatabasePool

beforeAll(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'mol-sqlite-tx-'))
  pool = createPool({ path: join(workDir, 'app.db') })
  setPool(pool)
  setStore(createStore(pool))
  await pool.query('CREATE TABLE "accounts" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL)')
})
afterAll(async () => {
  await pool.end()
  rmSync(workDir, { recursive: true, force: true })
})

describe('withTransaction on sqlite', () => {
  it('commits CRUD-helper writes made inside it, and they see each other', async () => {
    const seen = await withTransaction(async () => {
      await create('accounts', { id: 'a1', name: 'Ada' })
      await create('accounts', { id: 'a2', name: 'Grace' })
      return (await findMany('accounts', {})).length
    })
    expect(seen).toBe(2)
    expect(await count('accounts')).toBe(2)
  })

  it('rolls every write back when the callback throws', async () => {
    await expect(
      withTransaction(async () => {
        await create('accounts', { id: 'a3', name: 'Linus' })
        await query('INSERT INTO "accounts" ("id", "name") VALUES ($1, $2)', ['a4', 'Ken'])
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await count('accounts')).toBe(2)
  })

  it('joins an enclosing withTransaction instead of opening a second one', async () => {
    await expect(
      withTransaction(async () => {
        await withTransaction(async () => {
          await create('accounts', { id: 'a5', name: 'Barbara' })
        })
        throw new Error('outer fails')
      }),
    ).rejects.toThrow('outer fails')
    expect(await count('accounts')).toBe(2)
  })

  it('keeps an unrelated concurrent query out of the transaction', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    const tx = withTransaction(async () => {
      await create('accounts', { id: 'a6', name: 'Edsger' })
      await held
      throw new Error('discard')
    })
    // Started outside the callback's async context: queues behind the
    // transaction rather than running inside it (and being rolled back).
    const outside = create('accounts', { id: 'a7', name: 'Margaret' })
    release()
    await expect(tx).rejects.toThrow('discard')
    await outside
    const names = (await findMany<{ name: string }>('accounts', {})).map((r) => r.name).sort()
    expect(names).toEqual(['Ada', 'Grace', 'Margaret'])
  })

  it('fails, naming the fix, a pool query that waits 30 s behind a manual transaction', async () => {
    vi.useFakeTimers()
    try {
      const tx = await pool.transaction!()
      const waiting = expect(pool.query('SELECT 1')).rejects.toThrow(/withTransaction\(\)/)
      await vi.advanceTimersByTimeAsync(30_000)
      await waiting
      await tx.rollback()
      // The queue still works afterwards.
      expect((await pool.query<{ n: number }>('SELECT 1 AS n')).rows[0]?.n).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
