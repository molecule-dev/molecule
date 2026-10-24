/**
 * The SQLite bond's capability claims, exercised on the REAL engine
 * (`better-sqlite3`, the bond's own dependency).
 *
 * The claims that matter are behavioural, not documentary: a UNIQUE partial
 * index must constrain exactly the rows its predicate selects (not every row),
 * and a referential action must actually delete child rows — the pool turns
 * `PRAGMA foreign_keys` on for every connection, without which SQLite parses a
 * foreign key and enforces nothing.
 *
 * @module
 */

import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'

import { translateDdlToSqlite } from '../utilities.js'

const ADDRESSES = `
CREATE TABLE IF NOT EXISTS "addresses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "isDefaultShipping" BOOLEAN NOT NULL DEFAULT FALSE,
  "isDefaultBilling" BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS "idx_addresses_user" ON "addresses" ("userId");
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_shipping"
  ON "addresses" ("userId") WHERE "isDefaultShipping" = TRUE;
CREATE INDEX IF NOT EXISTS "idx_addresses_user_default_billing"
  ON "addresses" ("userId") WHERE "isDefaultBilling" = TRUE;
`

const PAYMENT_METHODS = `
CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

/** A deterministic valid UUID for a small integer — the setup columns are UUID-typed. */
const uuid = (value: number): string => `00000000-0000-0000-0000-${String(value).padStart(12, '0')}`

const openDatabase = (): Database.Database => {
  const db = new Database(':memory:')
  // What the bond's pool does on every connection; without it SQLite parses a
  // foreign key and enforces nothing.
  db.pragma('foreign_keys = ON')
  return db
}

const apply = (db: Database.Database, sql: string): void => {
  db.exec(translateDdlToSqlite(sql))
}

describe('SQLite partial indexes (real engine)', () => {
  it('applies a plain partial index and constrains nothing', () => {
    const db = openDatabase()
    try {
      apply(db, ADDRESSES)
      const indexes = db
        .prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'addresses'`)
        .all() as { name: string }[]
      expect(indexes.map((row) => row.name)).toEqual(
        expect.arrayContaining([
          'idx_addresses_user',
          'idx_addresses_user_default_shipping',
          'idx_addresses_user_default_billing',
        ]),
      )
      const insert = db.prepare(
        `INSERT INTO "addresses" ("id", "userId", "isDefaultShipping", "isDefaultBilling") VALUES (?, ?, ?, ?)`,
      )
      insert.run(uuid(1), uuid(11), 1, 1)
      insert.run(uuid(2), uuid(11), 1, 0)
      const count = db
        .prepare(`SELECT count(*) AS n FROM "addresses" WHERE "isDefaultShipping" = 1`)
        .get() as { n: number }
      expect(count.n).toBe(2)
    } finally {
      db.close()
    }
  })

  it('enforces a UNIQUE partial index exactly inside its predicate', () => {
    const db = openDatabase()
    try {
      apply(db, PAYMENT_METHODS)
      const insert = db.prepare(
        `INSERT INTO "payment_methods" ("id", "userId", "providerPaymentMethodId", "isDefault") VALUES (?, ?, ?, ?)`,
      )
      insert.run(uuid(1), uuid(11), 'pm_1', 1)
      insert.run(uuid(2), uuid(11), 'pm_2', 0)
      insert.run(uuid(3), uuid(11), 'pm_3', 0)
      // A second default for the same user is what the index forbids.
      expect(() => insert.run(uuid(4), uuid(11), 'pm_4', 1)).toThrowError(
        /UNIQUE constraint failed: payment_methods\.userId/,
      )
      // Another user's default is a different key.
      insert.run(uuid(5), uuid(12), 'pm_5', 1)
    } finally {
      db.close()
    }
  })

  it('keeps a multi-column UNIQUE partial index over nullable columns', () => {
    const db = openDatabase()
    try {
      apply(db, COURSES)
      const insert = db.prepare(`INSERT INTO "courses" ("id", "org_id", "slug") VALUES (?, ?, ?)`)
      // Rows outside the predicate (NULL slug) are not constrained.
      insert.run(uuid(1), uuid(21), null)
      insert.run(uuid(2), uuid(21), null)
      insert.run(uuid(3), uuid(21), 'a')
      insert.run(uuid(4), uuid(22), 'a')
      expect(() => insert.run(uuid(5), uuid(21), 'a')).toThrowError(/UNIQUE constraint failed/)
    } finally {
      db.close()
    }
  })

  it('enforces ON DELETE CASCADE because the pool enables foreign_keys', () => {
    const db = openDatabase()
    try {
      apply(db, CASCADE)
      db.prepare(`INSERT INTO "parents" ("id") VALUES (?)`).run(uuid(31))
      db.prepare(`INSERT INTO "children" ("id", "parentId") VALUES (?, ?)`).run(uuid(32), uuid(31))
      db.prepare(`DELETE FROM "parents" WHERE "id" = ?`).run(uuid(31))
      const remaining = db.prepare(`SELECT count(*) AS n FROM "children"`).get() as { n: number }
      expect(remaining.n).toBe(0)
    } finally {
      db.close()
    }
  })

  it('does not cascade when foreign_keys is off — the known-bad control', () => {
    const db = new Database(':memory:')
    // better-sqlite3 13 happens to default the pragma ON; turn it off explicitly
    // so this control tests the SQLite SEMANTICS the bond must guarantee, not the
    // driver's current default.
    db.pragma('foreign_keys = OFF')
    try {
      apply(db, CASCADE)
      db.prepare(`INSERT INTO "parents" ("id") VALUES (?)`).run(uuid(41))
      db.prepare(`INSERT INTO "children" ("id", "parentId") VALUES (?, ?)`).run(uuid(42), uuid(41))
      db.prepare(`DELETE FROM "parents" WHERE "id" = ?`).run(uuid(41))
      const remaining = db.prepare(`SELECT count(*) AS n FROM "children"`).get() as { n: number }
      // Proves the capability declaration rests on the pool's pragma, not on luck.
      expect(remaining.n).toBe(1)
    } finally {
      db.close()
    }
  })
})
