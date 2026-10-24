/**
 * The compatibility claims, exercised on the REAL DuckDB engine.
 *
 * Each test applies PostgreSQL-dialect setup SQL through `translateDdlToDuckdb`
 * and then asks the engine what it actually enforces: a translated partial index
 * must keep query results AND (for UNIQUE) the exact set of rows PostgreSQL
 * constrains, and a refused referential action must stay refused rather than
 * quietly become a different delete.
 */
import { type DuckDBConnection, DuckDBInstance } from '@duckdb/node-api'
import { describe, expect, it } from 'vitest'

import { translateDdlToDuckdb } from '../utilities.js'

const withConnection = async <T>(run: (connection: DuckDBConnection) => Promise<T>): Promise<T> => {
  const instance = await DuckDBInstance.create(':memory:')
  const connection = await instance.connect()
  try {
    return await run(connection)
  } finally {
    connection.closeSync()
    instance.closeSync()
  }
}

const rows = async (connection: DuckDBConnection, sql: string): Promise<unknown[][]> => {
  const result = await connection.run(sql)
  return result.getRowsJS() as unknown[][]
}

const apply = async (connection: DuckDBConnection, sql: string): Promise<void> => {
  await connection.run(translateDdlToDuckdb(sql))
}

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

/** A deterministic valid UUID for a small integer — the setup columns are UUID-typed. */
const uuid = (value: number): string => `00000000-0000-0000-0000-${String(value).padStart(12, '0')}`

const insertPayment = (id: string, user: string, providerId: string, isDefault: boolean): string =>
  `INSERT INTO "payment_methods" ("id", "userId", "providerPaymentMethodId", "isDefault") ` +
  `VALUES ('${id}', '${user}', '${providerId}', ${isDefault});`

describe('DuckDB partial-index translation (real engine)', () => {
  it('applies a plain partial index as a full index with identical query results', async () => {
    await withConnection(async (connection) => {
      await apply(connection, ADDRESSES)
      await connection.run(
        `INSERT INTO "addresses" ("id", "userId", "isDefaultShipping", "isDefaultBilling") VALUES
          ('${uuid(1)}', '${uuid(11)}', TRUE, TRUE),
          ('${uuid(2)}', '${uuid(11)}', TRUE, FALSE),
          ('${uuid(3)}', '${uuid(12)}', FALSE, TRUE)`,
      )
      const indexes = await rows(
        connection,
        `SELECT index_name FROM duckdb_indexes() WHERE table_name = 'addresses' ORDER BY index_name`,
      )
      expect(indexes.map((row) => String(row[0]))).toEqual([
        'idx_addresses_user',
        'idx_addresses_user_default_billing',
        'idx_addresses_user_default_shipping',
      ])
      // A non-unique index constrains nothing: a user may keep several addresses
      // flagged as the default shipping one, exactly as on PostgreSQL.
      const counts = await rows(
        connection,
        `SELECT count(*) FROM "addresses" WHERE "isDefaultShipping" = TRUE`,
      )
      expect(Number(counts[0]?.[0])).toBe(2)
    })
  })

  it('keeps UNIQUE partial-index semantics: one default per user, many non-defaults', async () => {
    await withConnection(async (connection) => {
      await apply(connection, PAYMENT_METHODS)
      await connection.run(insertPayment(`${uuid(1)}`, `${uuid(11)}`, 'pm_1', true))
      await connection.run(insertPayment(`${uuid(2)}`, `${uuid(11)}`, 'pm_2', false))
      await connection.run(insertPayment(`${uuid(3)}`, `${uuid(11)}`, 'pm_3', false))
      await expect(
        connection.run(insertPayment(`${uuid(4)}`, `${uuid(11)}`, 'pm_4', true)),
      ).rejects.toThrow(/Duplicate key/i)
      // Another user's default is a different key.
      await connection.run(insertPayment(`${uuid(5)}`, `${uuid(12)}`, 'pm_5', true))
    })
  })

  it('keeps UNIQUE partial-index semantics for a multi-column predicate (NULL slugs)', async () => {
    await withConnection(async (connection) => {
      await apply(connection, COURSES)
      await connection.run(
        `INSERT INTO "courses" ("id", "org_id", "slug") VALUES ('${uuid(1)}', '${uuid(21)}', NULL), ('${uuid(2)}', '${uuid(21)}', NULL)`,
      )
      await connection.run(
        `INSERT INTO "courses" ("id", "org_id", "slug") VALUES ('${uuid(3)}', '${uuid(21)}', 'a')`,
      )
      await connection.run(
        `INSERT INTO "courses" ("id", "org_id", "slug") VALUES ('${uuid(4)}', '${uuid(22)}', 'a')`,
      )
      await expect(
        connection.run(
          `INSERT INTO "courses" ("id", "org_id", "slug") VALUES ('${uuid(5)}', '${uuid(21)}', 'a')`,
        ),
      ).rejects.toThrow(/Duplicate key/i)
    })
  })

  it('proves the known-bad shortcut differs: stripping WHERE enforces one row per user', async () => {
    await withConnection(async (connection) => {
      // What "make it apply" would do if it kept UNIQUE and dropped the predicate.
      await connection.run(`
        CREATE TABLE "payment_methods_wrong" (
          "id" UUID PRIMARY KEY,
          "userId" UUID NOT NULL,
          "providerPaymentMethodId" TEXT NOT NULL,
          "isDefault" BOOLEAN NOT NULL DEFAULT false
        );
        CREATE UNIQUE INDEX "wrong_userId_idx" ON "payment_methods_wrong" ("userId");
      `)
      await connection.run(
        `INSERT INTO "payment_methods_wrong" ("id", "userId", "providerPaymentMethodId", "isDefault")
         VALUES ('${uuid(1)}', '${uuid(11)}', 'pm_1', true)`,
      )
      // PostgreSQL (and the CASE translation) allow this second, non-default row.
      await expect(
        connection.run(
          `INSERT INTO "payment_methods_wrong" ("id", "userId", "providerPaymentMethodId", "isDefault")
           VALUES ('${uuid(2)}', '${uuid(11)}', 'pm_2', false)`,
        ),
      ).rejects.toThrow(/Duplicate key/i)
    })
  })
})

describe('DuckDB referential actions (real engine)', () => {
  it('refuses ON DELETE CASCADE at translation time, naming the construct', async () => {
    expect(() =>
      translateDdlToDuckdb(
        'CREATE TABLE "comments" ("parentId" UUID REFERENCES "comments"("id") ON DELETE CASCADE);',
        { source: 'comments.sql' },
      ),
    ).toThrow(/ON DELETE CASCADE/)
  })

  it('proves why: the engine cannot cascade, so a stripped action changes the delete', async () => {
    await withConnection(async (connection) => {
      // The closest DuckDB can get: the FK WITHOUT the action, which is what a
      // silent strip would apply.
      await connection.run(`
        CREATE TABLE "parents" ("id" UUID PRIMARY KEY);
        CREATE TABLE "children" ("id" UUID PRIMARY KEY, "parentId" UUID REFERENCES "parents"("id"));
        INSERT INTO "parents" VALUES ('${uuid(31)}');
        INSERT INTO "children" VALUES ('${uuid(32)}', '${uuid(31)}');
      `)
      // PostgreSQL with ON DELETE CASCADE deletes the child; DuckDB refuses.
      await expect(
        connection.run(`DELETE FROM "parents" WHERE "id" = '${uuid(31)}'`),
      ).rejects.toThrow(/foreign key constraint|still referenced/i)
    })
  })

  it('accepts the actions DuckDB actually supports', async () => {
    await withConnection(async (connection) => {
      const sql = `CREATE TABLE "p" ("id" UUID PRIMARY KEY);
        CREATE TABLE "c" ("id" UUID PRIMARY KEY, "pId" UUID REFERENCES "p"("id") ON DELETE RESTRICT);`
      await expect(apply(connection, sql)).resolves.toBeUndefined()
    })
  })
})
