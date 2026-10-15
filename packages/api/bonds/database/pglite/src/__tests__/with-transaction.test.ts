/**
 * `withTransaction()` from `@molecule/api-database` on a real in-memory PGlite:
 * a raw `query()` made through the pool inside it joins the transaction (and
 * is rolled back with it) instead of waiting behind it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { query, setPool, withTransaction } from '@molecule/api-database'

import { createPool } from '../pool.js'

const pool = createPool({ dataDir: 'memory://' })

beforeAll(async () => {
  setPool(pool)
  await pool.query('CREATE TABLE notes (id TEXT PRIMARY KEY)')
})
afterAll(async () => {
  await pool.end()
})

const ids = async (): Promise<string[]> =>
  (await pool.query<{ id: string }>('SELECT id FROM notes ORDER BY id')).rows.map((r) => r.id)

describe('withTransaction on pglite', () => {
  it('commits pool queries made inside it', async () => {
    await withTransaction(async () => {
      await query('INSERT INTO notes (id) VALUES ($1)', ['n1'])
      await query('INSERT INTO notes (id) VALUES ($1)', ['n2'])
    })
    expect(await ids()).toEqual(['n1', 'n2'])
  })

  it('rolls them back when the callback throws', async () => {
    await expect(
      withTransaction(async () => {
        await query('INSERT INTO notes (id) VALUES ($1)', ['n3'])
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(await ids()).toEqual(['n1', 'n2'])
  })
})
