/**
 * The upgrade half of the line-order fix: a database that already applied
 * `orders.sql` never re-runs it — the migration ledger records a setup file
 * once — so the `position` column reaches an existing `order_items` only
 * through `orders_position.sql`. This drives the real SQLite migrator over a
 * database in exactly that state.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createMigrator } from '@molecule/api-database-sqlite'

const setup = new URL('../__setup__/', import.meta.url).pathname

let dir: string
let dbPath: string
let prevPath: string | undefined

/** The columns of `order_items`, read from the database file. */
const columns = (): string[] => {
  const db = new Database(dbPath)
  try {
    return (
      db.prepare("SELECT name FROM pragma_table_info('order_items')").all() as { name: string }[]
    ).map((c) => c.name)
  } finally {
    db.close()
  }
}

/** The setup files the ledger records as applied. */
const ledger = (): string[] => {
  const db = new Database(dbPath)
  try {
    return (
      db.prepare('SELECT file FROM "_molecule_migrations" ORDER BY file').all() as {
        file: string
      }[]
    ).map((r) => r.file)
  } finally {
    db.close()
  }
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'order-setup-upgrade-'))
  const setupDir = join(dir, '__setup__')
  mkdirSync(setupDir)
  copyFileSync(join(setup, 'orders.sql'), join(setupDir, 'orders.sql'))
  dbPath = join(dir, 'app.db')
  prevPath = process.env.SQLITE_PATH
  process.env.SQLITE_PATH = dbPath
  await createMigrator(setupDir)()
  // Undo the column, leaving every other effect of orders.sql in place: the
  // shape a database scaffolded before the column has.
  const db = new Database(dbPath)
  db.exec('ALTER TABLE "order_items" DROP COLUMN "position"')
  db.close()
})

afterAll(() => {
  if (prevPath === undefined) delete process.env.SQLITE_PATH
  else process.env.SQLITE_PATH = prevPath
  rmSync(dir, { recursive: true, force: true })
})

describe('order_items position upgrade', () => {
  it('adds position to a table that predates it, and records the new setup file', async () => {
    expect(columns()).not.toContain('position')
    expect(ledger()).toEqual(['orders.sql'])

    // The scaffold ships the package's setup files together; orders.sql is
    // already recorded, so the new file is what runs.
    copyFileSync(join(setup, 'orders_position.sql'), join(dir, '__setup__', 'orders_position.sql'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await createMigrator(join(dir, '__setup__'))()

    expect(columns()).toContain('position')
    expect(ledger()).toEqual(['orders.sql', 'orders_position.sql'])
    // Nothing warned: the file applies whole and is recorded, so the next boot
    // runs nothing of it.
    expect(warn).not.toHaveBeenCalled()
  })

  it('leaves the upgraded table usable: a row keeps its line order', () => {
    const db = new Database(dbPath)
    try {
      db.exec(`INSERT INTO "orders" ("id", "userId", "status") VALUES ('o', 'u', 'pending')`)
      db.exec(
        `INSERT INTO "order_items" ("orderId", "productId", "name", "price", "position")
         VALUES ('o', 'p2', 'Second line', 5, 1)`,
      )
      db.exec(
        `INSERT INTO "order_items" ("orderId", "productId", "name", "price", "position")
         VALUES ('o', 'p1', 'First line', 10, 0)`,
      )
      const rows = db
        .prepare(
          `SELECT "name" FROM "order_items" WHERE "orderId" = 'o' ORDER BY "position" ASC, "id" ASC`,
        )
        .all() as { name: string }[]
      expect(rows.map((r) => r.name)).toEqual(['First line', 'Second line'])
    } finally {
      db.close()
    }
  })
})
