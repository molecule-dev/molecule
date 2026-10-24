/**
 * The PGlite bond's capability claims, exercised on the REAL engine (the
 * package's own `@electric-sql/pglite` dependency — PostgreSQL compiled to
 * WebAssembly, in memory).
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'

import { createPool } from '../pool.js'
import type { PglitePool } from '../types.js'

const PAYMENT_METHODS = `
CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL,
  "providerPaymentMethodId" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_providerPaymentMethodId_idx"
  ON "payment_methods" ("providerPaymentMethodId");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_userId_default_idx"
  ON "payment_methods" ("userId") WHERE "isDefault" = true;
`

const COURSES = `
CREATE TABLE IF NOT EXISTS "courses" (
  "id" UUID PRIMARY KEY,
  "org_id" UUID NOT NULL,
  "slug" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "courses_org_slug_idx"
  ON "courses" ("org_id", "slug")
  WHERE "slug" IS NOT NULL;
`

const CASCADE = `
CREATE TABLE IF NOT EXISTS "parents" ("id" UUID PRIMARY KEY);
CREATE TABLE IF NOT EXISTS "children" (
  "id" UUID PRIMARY KEY,
  "parentId" UUID NOT NULL REFERENCES "parents"("id") ON DELETE CASCADE
);
`

const ADDRESSES = `
CREATE TABLE IF NOT EXISTS "addresses" (
  "id" UUID PRIMARY KEY,
  "userId" UUID NOT NULL,
  "isDefaultShipping" BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_shipping"
  ON "addresses" ("userId") WHERE "isDefaultShipping" = true;
`

const uuid = (value: number): string => `00000000-0000-0000-0000-${String(value).padStart(12, '0')}`

let pool: PglitePool | undefined

afterEach(async () => {
  await pool?.end()
  pool = undefined
})

const open = async (): Promise<PglitePool> => {
  pool = createPool({ dataDir: 'memory://' })
  return pool
}

describe('PGlite SQL features (real engine)', () => {
  it('applies a queryable non-unique partial index without constraining rows', async () => {
    const db = await open()
    await db.exec(ADDRESSES)
    await db.query(
      `INSERT INTO "addresses" ("id", "userId", "isDefaultShipping") VALUES ($1, $2, true), ($3, $2, true)`,
      [uuid(1), uuid(11), uuid(2)],
    )
    const rows = await db.query<{ n: string }>(
      `SELECT count(*) AS n FROM "addresses" WHERE "isDefaultShipping" = true`,
    )
    expect(Number(rows.rows[0]?.n)).toBe(2)
    const indexes = await db.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'addresses' ORDER BY indexname`,
    )
    expect(indexes.rows.map((row) => row.indexname)).toContain(
      'idx_addresses_user_default_shipping',
    )
  })

  it('enforces a UNIQUE partial index exactly inside its predicate', async () => {
    const db = await open()
    await db.exec(PAYMENT_METHODS)
    const insert = (id: string, user: string, provider: string, isDefault: boolean) =>
      db.query(
        `INSERT INTO "payment_methods" ("id", "userId", "providerPaymentMethodId", "isDefault") VALUES ($1, $2, $3, $4)`,
        [id, user, provider, isDefault],
      )
    await insert(uuid(1), uuid(11), 'pm_1', true)
    await insert(uuid(2), uuid(11), 'pm_2', false)
    await insert(uuid(3), uuid(11), 'pm_3', false)
    await expect(insert(uuid(4), uuid(11), 'pm_4', true)).rejects.toThrow(
      /duplicate key value|unique constraint/i,
    )
    await insert(uuid(5), uuid(12), 'pm_5', true)
  })

  it('keeps a multi-column UNIQUE partial index over nullable columns', async () => {
    const db = await open()
    await db.exec(COURSES)
    const insert = (id: string, org: string, slug: string | null) =>
      db.query(`INSERT INTO "courses" ("id", "org_id", "slug") VALUES ($1, $2, $3)`, [
        id,
        org,
        slug,
      ])
    await insert(uuid(1), uuid(21), null)
    await insert(uuid(2), uuid(21), null)
    await insert(uuid(3), uuid(21), 'a')
    await insert(uuid(4), uuid(22), 'a')
    await expect(insert(uuid(5), uuid(21), 'a')).rejects.toThrow(
      /duplicate key value|unique constraint/i,
    )
  })

  it('enforces ON DELETE CASCADE', async () => {
    const db = await open()
    await db.exec(CASCADE)
    await db.query(`INSERT INTO "parents" ("id") VALUES ($1)`, [uuid(31)])
    await db.query(`INSERT INTO "children" ("id", "parentId") VALUES ($1, $2)`, [
      uuid(32),
      uuid(31),
    ])
    await db.query(`DELETE FROM "parents" WHERE "id" = $1`, [uuid(31)])
    const rows = await db.query<{ n: string }>(`SELECT count(*) AS n FROM "children"`)
    expect(Number(rows.rows[0]?.n)).toBe(0)
  })
})
