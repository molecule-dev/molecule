/**
 * Utility functions for DuckDB operations.
 *
 * @module
 */

import { blobValue, type DuckDBValue } from '@duckdb/node-api'

/**
 * Translate PostgreSQL-dialect DDL to DuckDB-compatible DDL at migration time.
 *
 * Resource/template setup migrations are authored in PostgreSQL dialect. DuckDB
 * 2.0 already speaks most of it natively — `uuid`/`timestamptz`/`bytea`/`text[]`
 * type names, `gen_random_uuid()`, `now()`, `CURRENT_TIMESTAMP`, `::` casts,
 * `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`, `ON CONFLICT`, `ILIKE` —
 * all verified against 2.0.0-r.1. The two constructs it rejects are rewritten
 * here:
 *
 * - `jsonb` → `json`, in both the column-type position and the `::jsonb` cast
 *   (DuckDB has a `JSON` type, stored as VARCHAR; there is no `jsonb`).
 * - `USING <method>` on a `CREATE INDEX` (`gin`/`btree`/`hash`/`gist`) →
 *   removed: DuckDB indexes have no access method (4 096 `USING btree` across
 *   the resource setup library; leaving one in raises
 *   `Binder Error: Unknown index type: btree` and aborts the migration).
 *
 * Everything else passes through untouched — unlike the sqlite bond, no
 * placeholder conversion or timestamp-default rewriting happens here.
 *
 * @param sql - Raw migration SQL, possibly in Postgres dialect.
 * @returns DuckDB-compatible SQL.
 */
export const translateDdlToDuckdb = (sql: string): string =>
  sql.replace(/\bjsonb\b/gi, 'json').replace(/\s+USING\s+(gin|btree|hash|gist)\b/gi, '')

/**
 * Coerce a JS value into something `@duckdb/node-api` can bind. The client
 * infers a parameter's type from the VALUE and only understands `null`,
 * booleans, numbers, bigints and strings — anything else fails at bind time
 * with `Cannot create values of type ANY. Specify a specific type.`, which
 * would crash every `create()`/`update()` that passes a `Date`, a boolean-ish
 * object or a jsonb value. Strings cast on the way in: DuckDB implicitly casts
 * a bound VARCHAR to UUID/TIMESTAMPTZ/DECIMAL/JSON/LIST parameters, verified
 * against 2.0.0-r.1.
 *
 * @param value - The value to bind.
 * @returns A `@duckdb/node-api`-bindable value.
 */
export const coerceDuckdbParam = (value: unknown): DuckDBValue => {
  if (value === undefined || value === null) return null
  if (
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'string'
  ) {
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array) return blobValue(value)
  if (typeof value === 'object') return JSON.stringify(value)
  throw new Error(
    `DuckDB: cannot bind a value of type ${typeof value} — pass a string, number, boolean, ` +
      'bigint, Date, Uint8Array, plain object or array.',
  )
}

/**
 * Normalize DuckDB result rows to the JS shapes the other database bonds hand
 * back. DuckDB's JS conversion returns a `bigint` for every 64+-bit integer —
 * `COUNT(*)`, `BIGINT` and `HUGEINT` columns — and `JSON.stringify` THROWS on a
 * bigint, so a handler that serializes a row with `COUNT(*)` in it would 500.
 * A bigint within `Number.MAX_SAFE_INTEGER` becomes a JS number (matching the
 * sqlite bond); a larger one becomes its decimal string (matching node-postgres
 * `int8AsString`). Mutates rows in place for speed.
 *
 * @param rows - Row objects from `result.getRowObjectsJS()`.
 * @returns The normalized rows.
 */
export const normalizeDuckdbRows = <T>(rows: Record<string, unknown>[]): T[] => {
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const value = row[key]
      if (typeof value === 'bigint') {
        row[key] =
          value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)
            ? Number(value)
            : value.toString()
      }
    }
  }
  return rows as T[]
}

/**
 * Parse the JSON-typed columns of a table's rows into values, matching what
 * the postgresql/sqlite bonds hand back from a `json`/`jsonb` column. DuckDB's
 * `JSON` type is an alias over VARCHAR, so a JSON column always READS as its
 * JSON text — the column's type is only visible in
 * `information_schema.columns.data_type`, never in the result metadata, which
 * is why this runs in the DataStore (it knows the table) and not in the pool.
 * A value that is not valid JSON text is left as the raw string.
 *
 * @param rows - Row objects.
 * @param jsonColumns - The table's JSON-typed column names, lower-cased.
 * @returns The rows with JSON columns parsed.
 */
export const parseJsonColumns = <T>(
  rows: Record<string, unknown>[],
  jsonColumns: Set<string>,
): T[] => {
  if (jsonColumns.size === 0) return rows as T[]
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!jsonColumns.has(key.toLowerCase())) continue
      if (typeof row[key] === 'string') {
        try {
          row[key] = JSON.parse(row[key] as string)
        } catch (_error) {
          // A non-JSON string in a JSON-typed column: DuckDB allows it (the
          // type is VARCHAR underneath), so leave the caller's value alone.
        }
      }
    }
  }
  return rows as T[]
}
