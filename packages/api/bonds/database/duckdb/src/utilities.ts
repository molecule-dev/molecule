/**
 * Utility functions for DuckDB operations.
 *
 * @module
 */

import { blobValue, type DuckDBValue } from '@duckdb/node-api'

import type { SqlCompatibilityIssue, SqlFeature } from '@molecule/api-database/sql-compatibility.js'

import { sqlCapabilities } from './capabilities.js'
import {
  parseCreateIndexStatement,
  referentialActionsIn,
  splitSqlColumns,
  splitSqlStatements,
} from './sql-dialect.js'

/**
 * Options for {@link translateDdlToDuckdb}.
 */
export interface TranslateDdlOptions {
  /** File name the SQL came from; copied into an unsupported-construct error. */
  source?: string
}

/**
 * The error this bond's translator throws when a migration needs a construct
 * DuckDB cannot honour. Named and typed so a caller can tell a genuine dialect
 * limit apart from malformed SQL, and report it without a migration run.
 *
 * The diagnostic itself is described by the core TYPE contract
 * ({@link SqlCompatibilityIssue}); this class is the bond's own error
 * construction, next to the translation that raises it.
 */
export class UnsupportedSqlFeatureError extends Error {
  /** The construct's feature. */
  readonly feature: SqlFeature
  /** The exact construct found in the migration. */
  readonly detail: string
  /** Where the statement came from, when known. */
  readonly source?: string

  /**
   * Build the error from a compatibility diagnostic, copying its message and fields.
   *
   * @param issue - The diagnostic being refused.
   */
  constructor(issue: SqlCompatibilityIssue) {
    super(issue.message)
    this.name = 'UnsupportedSqlFeatureError'
    this.feature = issue.feature
    this.detail = issue.detail
    this.source = issue.source
  }
}

/**
 * The first referential action this bond cannot reproduce, as a diagnostic.
 *
 * Absence is never support: the bond refuses unless its own declaration says the
 * construct is `native` or `translated`. The note is the same text the
 * generator's preflight prints, so a boot-time refusal and a scaffold-time one
 * say the same thing.
 *
 * @param sql - The migration SQL.
 * @param source - The file the SQL came from, when known.
 * @returns The diagnostic, or null when no unsupported action is present.
 */
const firstRefusedReferentialAction = (
  sql: string,
  source: string | undefined,
): SqlCompatibilityIssue | null => {
  const capability = sqlCapabilities['fk-referential-action']
  if (capability && capability.support !== 'unsupported') return null
  for (const statement of splitSqlStatements(sql)) {
    const detail = referentialActionsIn(statement.text)[0]
    if (!detail) continue
    return {
      kind: 'unsupported',
      feature: 'fk-referential-action',
      detail,
      statement: statement.text.trim(),
      source,
      message:
        `DuckDB cannot apply ${detail}${source ? ` in ${source}` : ''}` +
        `${capability?.note ? ` — ${capability.note}` : '.'}`,
    }
  }
  return null
}

/**
 * Translate PostgreSQL-dialect DDL to DuckDB-compatible DDL at migration time.
 *
 * Resource/template setup migrations are authored in PostgreSQL dialect. DuckDB
 * 2.0 already speaks most of it natively — `uuid`/`timestamptz`/`bytea`/`text[]`
 * type names, `gen_random_uuid()`, `now()`, `CURRENT_TIMESTAMP`, `::` casts,
 * `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`, `ON CONFLICT`, `ILIKE` —
 * all verified against 2.0.0-r.1. The constructs it rejects are rewritten here,
 * and only where the rewrite preserves behaviour:
 *
 * - `jsonb` → `json`, in both the column-type position and the `::jsonb` cast
 *   (DuckDB has a `JSON` type, stored as VARCHAR; there is no `jsonb`).
 * - `USING <method>` on a `CREATE INDEX` (`gin`/`btree`/`hash`/`gist`) →
 *   removed: DuckDB indexes have no access method.
 * - A partial index gets no `WHERE` support in DuckDB. A non-unique partial
 *   index becomes a full index on the same columns — the predicate only narrows
 *   which rows the index covers, never a query's result. A UNIQUE partial index
 *   becomes a UNIQUE index over `CASE WHEN <predicate> THEN <column> END` per
 *   column: rows outside the predicate get NULL keys (distinct in DuckDB), so
 *   uniqueness applies to exactly the rows PostgreSQL would constrain.
 *
 * What it does NOT rewrite is an `ON DELETE`/`ON UPDATE` referential action
 * (`CASCADE`, `SET NULL`, `SET DEFAULT`): DuckDB rejects the clause at parse
 * time and has no triggers, so dropping it would turn a cascading delete into a
 * refusing one. Such SQL throws {@link UnsupportedSqlFeatureError}, naming the
 * construct — see {@link sqlCapabilities}. The compatibility preflight in the
 * generator rejects those resource/provider combinations before an app exists;
 * this throw is the last line of defence for SQL that reaches the runner another
 * way.
 *
 * Everything else passes through untouched — unlike the sqlite bond, no
 * placeholder conversion or timestamp-default rewriting happens here.
 *
 * @param sql - Raw migration SQL, possibly in Postgres dialect.
 * @param options - The source file name used in an unsupported-construct error.
 * @returns DuckDB-compatible SQL.
 * @throws {UnsupportedSqlFeatureError} When the SQL needs a construct DuckDB
 *   cannot reproduce without changing its behaviour.
 */
export const translateDdlToDuckdb = (sql: string, options: TranslateDdlOptions = {}): string => {
  const refused = firstRefusedReferentialAction(sql, options.source)
  if (refused) throw new UnsupportedSqlFeatureError(refused)

  const chunks: string[] = []
  let cursor = 0
  for (const statement of splitSqlStatements(sql)) {
    chunks.push(sql.slice(cursor, statement.start))
    chunks.push(rewriteIndexStatement(statement.text))
    cursor = statement.end
  }
  chunks.push(sql.slice(cursor))
  return chunks.join('').replace(/\bjsonb\b/gi, 'json')
}

/**
 * Rewrite one statement's DuckDB-incompatible index constructs.
 *
 * Every statement that is not a `CREATE INDEX` is returned unchanged, so this
 * touches only index text. Index options (`WITH (...)`, `INCLUDE (...)`) are not
 * translated: DuckDB has no equivalent, and guessing would hide a real
 * difference, so the statement throws instead.
 *
 * @param statement - One statement from `splitSqlStatements`.
 * @returns The statement in DuckDB dialect.
 */
const rewriteIndexStatement = (statement: string): string => {
  const index = parseCreateIndexStatement(statement)
  if (!index) return statement
  if (index.optionsBeforeWhere) {
    throw new Error(
      `DuckDB: index options are not supported ("${index.optionsBeforeWhere}") — ` +
        'remove them from the index or use a database that supports them.',
    )
  }
  if (!index.predicate) {
    // The parser already removed `USING <method>`; the rest is DuckDB-valid.
    return `${index.prefix}${index.columns})${index.afterClose}`
  }
  if (!index.unique) {
    // Non-unique: the predicate only decides which rows the index covers.
    return `${index.prefix}${index.columns})${index.afterPredicate ?? ''}`
  }
  const predicate = index.predicate
  const columns = splitSqlColumns(index.columns)
    .map((column) => `(CASE WHEN (${predicate}) THEN (${column}) END)`)
    .join(', ')
  return `${index.prefix}${columns})${index.afterPredicate ?? ''}`
}

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
