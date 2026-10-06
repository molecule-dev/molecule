/**
 * The lazily-opened default pool and store.
 *
 * @module
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getPoolInstance, pool, store } from '../defaults.js'

let previous: string | undefined

beforeAll(() => {
  previous = process.env.PGLITE_DATA_DIR
  process.env.PGLITE_DATA_DIR = 'memory://'
})

afterAll(async () => {
  await pool.end()
  if (previous === undefined) delete process.env.PGLITE_DATA_DIR
  else process.env.PGLITE_DATA_DIR = previous
})

describe('default pool and store', () => {
  it('open lazily from PGLITE_DATA_DIR and share one database', async () => {
    await pool.query('CREATE TABLE "things" ("id" UUID PRIMARY KEY, "name" TEXT)')
    const created = await store.create<{ id: string; name: string }>('things', { name: 'x' })
    expect(created.data?.name).toBe('x')
    expect(await store.count('things')).toBe(1)
    expect(pool.dataDir).toBe('memory://')
    expect(getPoolInstance().dataDir).toBe('memory://')
  })
})
