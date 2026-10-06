/**
 * Shared database bond contract suite.
 *
 * One set of behaviours every Postgres-dialect `DatabasePool` + `DataStore`
 * pair must satisfy, written against the `@molecule/api-database` interfaces
 * only, so the SAME file can be pointed at another bond:
 *
 * ```ts
 * import { createPool, createStore } from '@molecule/api-database-postgresql'
 * describeDatabaseContract('postgresql', async () => {
 *   const pool = createPool({ connectionString: process.env.TEST_DATABASE_URL })
 *   return { pool, store: createStore(pool), teardown: () => pool.end() }
 * })
 * ```
 *
 * Value shapes asserted here are node-postgres's defaults (numeric and int8 as
 * strings, json parsed, timestamptz as Date), which is what app code written
 * for the postgresql bond relies on.
 *
 * @module
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { DatabasePool, DataStore } from '@molecule/api-database'

/** What a bond under test hands the suite. */
export interface ContractSubject {
  /** The pool under test. */
  pool: DatabasePool
  /** A store built on that pool. */
  store: DataStore
  /** Closes everything the setup opened. */
  teardown?: () => Promise<void>
}

const DDL = [
  `DROP TABLE IF EXISTS "contract_child"`,
  `DROP TABLE IF EXISTS "contract_items"`,
  `CREATE TABLE "contract_items" (
    "id" UUID PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "price" NUMERIC(10, 2),
    "big" BIGINT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB,
    "doc" JSON,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE "contract_child" (
    "id" UUID PRIMARY KEY,
    "item_id" UUID NOT NULL REFERENCES "contract_items" ("id")
  )`,
]

/**
 * Registers the contract suite for one bond.
 *
 * @param label - Bond name shown in the test output.
 * @param setup - Opens a fresh pool + store for the suite.
 */
export function describeDatabaseContract(
  label: string,
  setup: () => Promise<ContractSubject>,
): void {
  describe(`database bond contract: ${label}`, () => {
    let subject: ContractSubject
    let pool: DatabasePool
    let store: DataStore

    beforeAll(async () => {
      subject = await setup()
      pool = subject.pool
      store = subject.store
    })

    afterAll(async () => {
      await pool.query('DROP TABLE IF EXISTS "contract_child"')
      await pool.query('DROP TABLE IF EXISTS "contract_items"')
      await subject.teardown?.()
    })

    beforeEach(async () => {
      for (const sql of DDL) await pool.query(sql)
    })

    const uuid = (): string => globalThis.crypto.randomUUID()

    /**
     * Inserts one item row.
     *
     * @param name - Item name (unique).
     * @param qty - Quantity.
     * @returns The new row's id.
     */
    const insertItem = async (name: string, qty = 0): Promise<string> => {
      const id = uuid()
      await pool.query('INSERT INTO "contract_items" ("id", "name", "qty") VALUES ($1, $2, $3)', [
        id,
        name,
        qty,
      ])
      return id
    }

    /**
     * Counts item rows.
     *
     * @returns The row count as a number.
     */
    const countItems = async (): Promise<number> => {
      const r = await pool.query<{ c: string }>('SELECT COUNT(*) AS "c" FROM "contract_items"')
      return Number(r.rows[0]?.c)
    }

    describe('raw queries', () => {
      it('inserts, selects, updates and deletes with $N parameters', async () => {
        const id = uuid()
        const inserted = await pool.query<{ id: string; name: string }>(
          'INSERT INTO "contract_items" ("id", "name", "qty") VALUES ($1, $2, $3) RETURNING "id", "name"',
          [id, 'apple', 3],
        )
        expect(inserted.rowCount).toBe(1)
        expect(inserted.rows).toEqual([{ id, name: 'apple' }])

        const selected = await pool.query<{ qty: number }>(
          'SELECT "qty" FROM "contract_items" WHERE "id" = $1',
          [id],
        )
        expect(selected.rows).toEqual([{ qty: 3 }])
        expect(selected.rowCount).toBe(1)
        expect(selected.fields?.map((f) => f.name)).toEqual(['qty'])

        const updated = await pool.query(
          'UPDATE "contract_items" SET "qty" = "qty" + $1 WHERE "id" = $2',
          [2, id],
        )
        expect(updated.rowCount).toBe(1)
        expect(updated.rows).toEqual([])

        const missing = await pool.query('UPDATE "contract_items" SET "qty" = 0 WHERE "id" = $1', [
          uuid(),
        ])
        expect(missing.rowCount).toBe(0)

        const deleted = await pool.query('DELETE FROM "contract_items" WHERE "id" = $1', [id])
        expect(deleted.rowCount).toBe(1)
        expect(await countItems()).toBe(0)
      })

      it('binds parameters as values, never as SQL', async () => {
        const evil = `x'); DROP TABLE "contract_items"; --`
        await insertItem(evil)
        const r = await pool.query<{ name: string }>(
          'SELECT "name" FROM "contract_items" WHERE "name" = $1',
          [evil],
        )
        expect(r.rows[0]?.name).toBe(evil)
      })

      it('binds null and array parameters', async () => {
        const id = uuid()
        await pool.query(
          'INSERT INTO "contract_items" ("id", "name", "price", "tags") VALUES ($1, $2, $3, $4)',
          [id, 'nulls', null, ['a', 'b']],
        )
        const r = await pool.query<{ price: unknown; tags: string[] }>(
          'SELECT "price", "tags" FROM "contract_items" WHERE "id" = ANY($1)',
          [[id, uuid()]],
        )
        expect(r.rows).toEqual([{ price: null, tags: ['a', 'b'] }])
      })
    })

    describe('transactions', () => {
      it('commit() keeps the writes', async () => {
        const tx = await pool.transaction!()
        try {
          await tx.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
            uuid(),
            'kept',
          ])
          await tx.commit()
        } catch (error) {
          await tx.rollback()
          throw error
        }
        expect(await countItems()).toBe(1)
      })

      it('rollback() discards the writes', async () => {
        const tx = await pool.transaction!()
        await tx.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
          uuid(),
          'gone',
        ])
        const inside = await tx.query<{ c: string }>('SELECT COUNT(*) AS "c" FROM "contract_items"')
        expect(Number(inside.rows[0]?.c)).toBe(1)
        await tx.rollback()
        expect(await countItems()).toBe(0)
      })

      it('a failed statement aborts the transaction and rollback() recovers', async () => {
        await insertItem('dupe')
        const tx = await pool.transaction!()
        await tx.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
          uuid(),
          'first',
        ])
        await expect(
          tx.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [uuid(), 'dupe']),
        ).rejects.toMatchObject({ code: '23505' })
        await expect(tx.query('SELECT 1')).rejects.toMatchObject({ code: '25P02' })
        await tx.rollback()
        expect(await countItems()).toBe(1)
        // The pool is usable again afterwards.
        await insertItem('after')
        expect(await countItems()).toBe(2)
      })

      it('a manual BEGIN/COMMIT on connect() is atomic', async () => {
        const conn = await pool.connect()
        try {
          await conn.query('BEGIN')
          await conn.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
            uuid(),
            'one',
          ])
          await conn.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
            uuid(),
            'two',
          ])
          await conn.query('ROLLBACK')
        } finally {
          conn.release()
        }
        expect(await countItems()).toBe(0)
      })
    })

    describe('errors', () => {
      it('maps a unique violation to SQLSTATE 23505 with the constraint name', async () => {
        await insertItem('unique-me')
        const error = await insertItem('unique-me').catch((e: unknown) => e)
        expect(error).toBeInstanceOf(Error)
        expect(error).toMatchObject({
          code: '23505',
          constraint: 'contract_items_name_key',
          table: 'contract_items',
        })
        expect((error as Error).message).toMatch(/duplicate key value/)
      })

      it('maps foreign-key, not-null and missing-table errors to their SQLSTATEs', async () => {
        await expect(
          pool.query('INSERT INTO "contract_child" ("id", "item_id") VALUES ($1, $2)', [
            uuid(),
            uuid(),
          ]),
        ).rejects.toMatchObject({ code: '23503' })
        await expect(
          pool.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [uuid(), null]),
        ).rejects.toMatchObject({ code: '23502', column: 'name' })
        await expect(pool.query('SELECT * FROM "no_such_table"')).rejects.toMatchObject({
          code: '42P01',
        })
      })
    })

    describe('concurrency', () => {
      it('runs many concurrent queries without losing any', async () => {
        await Promise.all(Array.from({ length: 25 }, (_, i) => insertItem(`c${i}`, i)))
        expect(await countItems()).toBe(25)
        const sum = await pool.query<{ s: string }>(
          'SELECT SUM("qty") AS "s" FROM "contract_items"',
        )
        expect(Number(sum.rows[0]?.s)).toBe(300)
      })

      it('keeps plain queries out of a concurrent transaction', async () => {
        const tx = await pool.transaction!()
        const txWork = (async () => {
          await tx.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
            uuid(),
            'tx-row',
          ])
          await new Promise((resolve) => setTimeout(resolve, 20))
          await tx.rollback()
        })()
        // Issued while the transaction is open; must not be rolled back with it.
        const outside = Promise.all([insertItem('outside-1'), insertItem('outside-2')])
        await Promise.all([txWork, outside])
        const names = await pool.query<{ name: string }>(
          'SELECT "name" FROM "contract_items" ORDER BY "name"',
        )
        expect(names.rows.map((r) => r.name)).toEqual(['outside-1', 'outside-2'])
      })

      it('serializes concurrent transactions', async () => {
        const run = async (name: string): Promise<void> => {
          const tx = await pool.transaction!()
          try {
            await tx.query('INSERT INTO "contract_items" ("id", "name") VALUES ($1, $2)', [
              uuid(),
              name,
            ])
            await tx.commit()
          } catch (error) {
            await tx.rollback()
            throw error
          }
        }
        await Promise.all([run('t1'), run('t2'), run('t3')])
        expect(await countItems()).toBe(3)
      })
    })

    describe('value round-trips (node-postgres shapes)', () => {
      it('round-trips json, jsonb, timestamptz, boolean, bigint, numeric and arrays', async () => {
        const id = uuid()
        const when = new Date('2026-01-02T03:04:05.678Z')
        const meta = { nested: { list: [1, 'two', null] }, flag: true }
        const doc = [1, { y: 2 }]
        await pool.query(
          `INSERT INTO "contract_items" ("id", "name", "price", "big", "active", "meta", "doc", "tags", "created_at")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            'types',
            '12.5',
            '9007199254740993',
            false,
            JSON.stringify(meta),
            JSON.stringify(doc),
            ['x', 'y'],
            when,
          ],
        )
        const r = await pool.query<Record<string, unknown>>(
          'SELECT * FROM "contract_items" WHERE "id" = $1',
          [id],
        )
        const row = r.rows[0]!
        expect(row.price).toBe('12.50') // numeric → string, scale kept
        expect(row.big).toBe('9007199254740993') // int8 → string, no precision loss
        expect(row.active).toBe(false)
        expect(row.meta).toEqual(meta)
        expect(row.doc).toEqual(doc)
        expect(row.tags).toEqual(['x', 'y'])
        expect(row.created_at).toBeInstanceOf(Date)
        expect((row.created_at as Date).toISOString()).toBe(when.toISOString())
        expect(row.qty).toBe(0) // int4 → number
      })

      it('returns COUNT(*) as a string', async () => {
        await insertItem('one')
        const r = await pool.query<{ c: unknown }>('SELECT COUNT(*) AS "c" FROM "contract_items"')
        expect(r.rows[0]?.c).toBe('1')
      })
    })

    describe('DataStore', () => {
      it('create() generates an id, serializes json columns and returns the row', async () => {
        const created = await store.create<Record<string, unknown>>('contract_items', {
          name: 'stored',
          qty: 2,
          meta: { a: [1, 2] },
        })
        expect(created.affected).toBe(1)
        expect(created.data?.id).toMatch(/^[0-9a-f-]{36}$/)
        expect(created.data?.meta).toEqual({ a: [1, 2] })
        const found = await store.findById<Record<string, unknown>>(
          'contract_items',
          created.data!.id as string,
        )
        expect(found?.name).toBe('stored')
      })

      it('findMany filters, sorts and paginates; count agrees', async () => {
        for (const [name, qty] of [
          ['Alpha', 1],
          ['beta', 2],
          ['Gamma 100%', 3],
          ['delta', 4],
        ] as const) {
          await store.create('contract_items', { name, qty })
        }
        const page = await store.findMany<{ name: string }>('contract_items', {
          where: [{ field: 'qty', operator: '>=', value: 2 }],
          orderBy: [{ field: 'qty', direction: 'desc' }],
          limit: 2,
          offset: 1,
          select: ['name'],
        })
        expect(page).toEqual([{ name: 'Gamma 100%' }, { name: 'beta' }])
        expect(
          await store.count('contract_items', [{ field: 'qty', operator: '>=', value: 2 }]),
        ).toBe(3)
        const like = await store.findMany<{ name: string }>('contract_items', {
          where: [{ field: 'name', operator: 'like', value: 'a%' }],
        })
        expect(like.map((r) => r.name)).toEqual(['Alpha'])
        const ilike = await store.findMany<{ name: string }>('contract_items', {
          where: [{ field: 'name', operator: 'ilike', value: '100%' }],
        })
        expect(ilike.map((r) => r.name)).toEqual(['Gamma 100%'])
        const inList = await store.findMany<{ name: string }>('contract_items', {
          where: [{ field: 'name', operator: 'in', value: ['beta', 'delta'] }],
          orderBy: [{ field: 'name', direction: 'asc' }],
        })
        expect(inList.map((r) => r.name)).toEqual(['beta', 'delta'])
        expect(
          await store.findOne<{ name: string }>('contract_items', [
            { field: 'qty', operator: '=', value: 4 },
          ]),
        ).toMatchObject({ name: 'delta' })
      })

      it('updates and deletes by id and by condition', async () => {
        const a = await store.create<{ id: string }>('contract_items', { name: 'a', qty: 1 })
        await store.create('contract_items', { name: 'b', qty: 1 })
        await store.create('contract_items', { name: 'c', qty: 5 })

        const updated = await store.updateById<{ qty: number }>('contract_items', a.data!.id, {
          qty: 9,
        })
        expect(updated).toMatchObject({ affected: 1, data: { qty: 9 } })

        const many = await store.updateMany(
          'contract_items',
          [{ field: 'qty', operator: '<', value: 5 }],
          { active: false },
        )
        expect(many.affected).toBe(1)

        expect((await store.deleteById('contract_items', a.data!.id)).affected).toBe(1)
        expect(
          (
            await store.deleteMany('contract_items', [
              { field: 'active', operator: '=', value: false },
            ])
          ).affected,
        ).toBe(1)
        expect(await store.count('contract_items')).toBe(1)
        await expect(store.deleteMany('contract_items', [])).rejects.toThrow(/WHERE/)
      })
    })
  })
}
