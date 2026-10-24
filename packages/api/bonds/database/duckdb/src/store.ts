/**
 * DuckDB DataStore implementation.
 *
 * Translates abstract DataStore CRUD methods to DuckDB SQL. DuckDB binds `?`
 * and `$1` placeholders natively positionally, so the SQL built here needs no
 * conversion on its way to the engine.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { getLogger } from '@molecule/api-bond'
import type {
  DatabasePool,
  DataStore,
  FindManyOptions,
  MutationResult,
  WhereCondition,
} from '@molecule/api-database'
import {
  assertFindManyOptions,
  assertOptionalWhereConditions,
  assertWhereConditions,
} from '@molecule/api-database/query-guards.js'

import { parseJsonColumns } from './utilities.js'

/**
 * Validates that an identifier (table/column name) is safe for SQL interpolation.
 * Hyphens are allowed: every interpolation site double-quotes the identifier, and
 * inside a quoted identifier only `"` itself is dangerous (still rejected). Real
 * consumers use hyphenated tables (e.g. `@molecule/api-resource-share`'s
 * `"resource-share-links"`) — parity with the postgresql/sqlite bonds.
 */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

/**
 * Validates that a SQL identifier (table or column name) is safe for interpolation.
 *
 * Table/column names cannot be bound as parameters, so they are interpolated
 * directly into the SQL string. Any value that reaches an interpolation point MUST be
 * validated here — otherwise a caller passing a user-supplied identifier (e.g. a
 * `sort_by` column from a query string) opens a SQL-injection hole. The whitelist of
 * plain `[A-Za-z_][A-Za-z0-9_-]*` identifiers makes the `"..."` quoting unbreakable.
 *
 * @param name - The identifier string to validate.
 */
function assertSafeIdentifier(name: string): void {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`)
  }
}

/**
 * Builds a SQL WHERE clause from WhereCondition[] using ? placeholders.
 *
 * @param conditions - Array of WhereCondition objects to convert to SQL.
 * @returns An object containing the SQL clause string and bound values array.
 */
function buildWhere(conditions: WhereCondition[]): { clause: string; values: unknown[] } {
  if (conditions.length === 0) {
    return { clause: '', values: [] }
  }

  const parts: string[] = []
  const values: unknown[] = []

  for (const cond of conditions) {
    assertSafeIdentifier(cond.field)
    switch (cond.operator) {
      case '=':
      case '!=':
      case '>':
      case '<':
      case '>=':
      case '<=':
        // A list given to a one-value operator matches nothing on every store: say so, the way
        // 'in' given a scalar does.
        if (Array.isArray(cond.value)) {
          throw new Error(
            `'${cond.operator}' operator takes one value, not a list (field "${cond.field}"); use 'in' for a list`,
          )
        }
        parts.push(`"${cond.field}" ${cond.operator} ?`)
        values.push(cond.value)
        break
      case 'in': {
        const arr = cond.value as unknown[]
        if (!Array.isArray(arr)) {
          throw new Error(
            `'${cond.operator}' operator requires an array value (field "${cond.field}")`,
          )
        }
        if (arr.length === 0) {
          // `IN ()` is a syntax error; match Postgres `= ANY('{}')` semantics: no match.
          parts.push('1 = 0')
          break
        }
        const placeholders = arr.map(() => '?').join(', ')
        parts.push(`"${cond.field}" IN (${placeholders})`)
        values.push(...arr)
        break
      }
      case 'not_in': {
        const arr = cond.value as unknown[]
        if (!Array.isArray(arr)) {
          throw new Error(
            `'${cond.operator}' operator requires an array value (field "${cond.field}")`,
          )
        }
        if (arr.length === 0) {
          // `NOT IN ()` is a syntax error; match Postgres `!= ALL('{}')`: everything matches.
          parts.push('1 = 1')
          break
        }
        const placeholders = arr.map(() => '?').join(', ')
        parts.push(`"${cond.field}" NOT IN (${placeholders})`)
        values.push(...arr)
        break
      }
      case 'like':
        // Case-insensitive RAW pattern match — the caller supplies the full SQL
        // pattern (their own %/_ wildcards are honored, NOT escaped). LOWER()
        // both sides for the documented core contract: `like` must be
        // case-insensitive and IDENTICAL across every bond (DuckDB's own LIKE
        // is case-sensitive; ILIKE exists but LIKE + LOWER() keeps the exact
        // sqlite/mysql spelling of the contract). ESCAPE '\' pins backslash as
        // THE escape character in the caller's pattern.
        parts.push(`LOWER("${cond.field}") LIKE LOWER(?) ESCAPE '\\'`)
        values.push(cond.value)
        break
      case 'ilike':
        // Case-insensitive CONTAINS on a literal substring — the documented core
        // contract (`@molecule/api-database` WhereCondition): escape the value's
        // LIKE metacharacters, wrap with `%…%`.
        parts.push(`LOWER("${cond.field}") LIKE LOWER(?) ESCAPE '\\'`)
        values.push(`%${String(cond.value).replace(/[%_\\]/g, '\\$&')}%`)
        break
      case 'is_null':
        parts.push(`"${cond.field}" IS NULL`)
        break
      case 'is_not_null':
        parts.push(`"${cond.field}" IS NOT NULL`)
        break
      default:
        // Parity with the postgres/sqlite bonds: an unknown operator must FAIL
        // LOUDLY, not silently drop the condition (which would return unfiltered rows).
        throw new Error(
          `Invalid SQL operator: ${String((cond as { operator: unknown }).operator)}. The operators are lowercase: =, !=, >, <, >=, <=, in, not_in, like, ilike, is_null, is_not_null.`,
        )
    }
  }

  return { clause: `WHERE ${parts.join(' AND ')}`, values }
}

/**
 * Builds an ORDER BY clause.
 *
 * @param orderBy - Array of field/direction pairs to sort by.
 * @returns A SQL ORDER BY clause string, or an empty string if none provided.
 */
function buildOrderBy(orderBy?: { field: string; direction: 'asc' | 'desc' }[]): string {
  if (!orderBy || orderBy.length === 0) return ''
  return `ORDER BY ${orderBy
    .map((o) => {
      assertSafeIdentifier(o.field)
      // Whitelist the direction to exactly ASC/DESC — never interpolate an
      // arbitrary `toUpperCase()` of caller input into the SQL string.
      const dir = o.direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      return `"${o.field}" ${dir}`
    })
    .join(', ')}`
}

/**
 * Creates a DataStore backed by a DuckDB DatabasePool.
 *
 * @param pool - The DuckDB DatabasePool to use for queries.
 * @returns A DataStore that translates CRUD operations to DuckDB-compatible SQL.
 */
export function createStore(pool: DatabasePool): DataStore {
  // Cache of "this table's JSON-typed columns" so rows read back through the
  // CRUD helpers carry parsed values, not JSON text.
  const jsonColumnsCache = new Map<string, Promise<Set<string>>>()

  /**
   * The JSON-typed columns of a table, lower-cased (cached). DuckDB's `JSON`
   * type is an alias over VARCHAR, so a JSON column reads as its JSON text and
   * the column's type is visible ONLY in `information_schema.columns` — never
   * in the result metadata. Without this, a `meta` JSON column round-trips as
   * a string through `create()`/`findMany()` on this bond while the same row
   * parses on the postgresql/sqlite bonds.
   *
   * @param table - The table name to introspect.
   * @returns Its JSON-typed column names, lower-cased.
   */
  function jsonColumnsFor(table: string): Promise<Set<string>> {
    const cached = jsonColumnsCache.get(table)
    if (cached) return cached
    const query = pool
      .query<{ column_name: string }>(
        "SELECT column_name FROM information_schema.columns WHERE table_name = ? AND data_type = 'JSON'",
        [table],
      )
      .then((result) => new Set(result.rows.map((row) => String(row.column_name).toLowerCase())))
      .catch((error: unknown) => {
        // A missing table has no JSON columns either; the caller's own query
        // against it will name the real problem, so only log here.
        getLogger().warn('DuckDB: could not list JSON columns', {
          error,
          table,
        })
        return new Set<string>()
      })
    jsonColumnsCache.set(table, query)
    return query
  }

  /**
   * Run a query for `table`, parsing its JSON columns back into values and
   * naming the table in a column/table error (DuckDB's "does not exist" errors
   * name neither — the same gap the sqlite store patches with `queryOn`).
   *
   * @param table - The table the statement is for.
   * @param sql - The statement.
   * @param values - Its parameters.
   * @returns The query result with JSON columns parsed.
   */
  async function queryOn<T = Record<string, unknown>>(
    table: string,
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    let result: { rows: Record<string, unknown>[]; rowCount: number | null }
    try {
      result = await pool.query<Record<string, unknown>>(sql, values)
    } catch (error) {
      if (
        error instanceof Error &&
        /does not exist|referenced table .* not found|no matching entry/i.test(error.message) &&
        !error.message.includes(`(table "${table}")`)
      ) {
        error.message = `${error.message} (table "${table}")`
      }
      throw error
    }
    return {
      rows: parseJsonColumns<T>(result.rows, await jsonColumnsFor(table)),
      rowCount: result.rowCount,
    }
  }

  return {
    async findById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      const result = await queryOn<T>(table, `SELECT * FROM "${table}" WHERE "id" = ? LIMIT 1`, [
        id,
      ])
      return result.rows[0] ?? null
    },

    async findOne<T = Record<string, unknown>>(
      table: string,
      where: WhereCondition[],
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      assertWhereConditions(where, 'findOne')
      const { clause, values } = buildWhere(where)
      const result = await queryOn<T>(table, `SELECT * FROM "${table}" ${clause} LIMIT 1`, values)
      return result.rows[0] ?? null
    },

    async findMany<T = Record<string, unknown>>(
      table: string,
      options?: FindManyOptions,
    ): Promise<T[]> {
      assertSafeIdentifier(table)
      assertFindManyOptions(options)
      const { clause, values } = buildWhere(options?.where ?? [])
      const selectFields =
        options?.select
          ?.map((s) => {
            assertSafeIdentifier(s)
            return `"${s}"`
          })
          .join(', ') ?? '*'
      const orderBy = buildOrderBy(options?.orderBy)
      // Safety cap: if caller doesn't specify a limit, apply a default to prevent
      // unbounded queries from returning millions of rows and exhausting memory.
      const MAX_DEFAULT_LIMIT = 10_000
      const effectiveLimit = Math.max(
        0,
        Math.min(Number(options?.limit ?? MAX_DEFAULT_LIMIT), MAX_DEFAULT_LIMIT),
      )
      const limit = `LIMIT ${effectiveLimit}`
      // Validate offset as a non-negative integer to prevent SQL injection.
      const safeOffset =
        options?.offset != null ? Math.max(0, Math.floor(Number(options.offset))) : 0
      const offset = safeOffset > 0 ? `OFFSET ${safeOffset}` : ''

      const sql =
        `SELECT ${selectFields} FROM "${table}" ${clause} ${orderBy} ${limit} ${offset}`.trim()
      const result = await queryOn<T>(table, sql, values)
      return result.rows
    },

    async count(table: string, where?: WhereCondition[]): Promise<number> {
      assertSafeIdentifier(table)
      assertOptionalWhereConditions(where)
      const { clause, values } = buildWhere(where ?? [])
      const result = await queryOn<{ count: number }>(
        table,
        `SELECT COUNT(*) AS "count" FROM "${table}" ${clause}`,
        values,
      )
      return Number(result.rows[0]?.count ?? 0)
    },

    async create<T = Record<string, unknown>>(
      table: string,
      data: Record<string, unknown>,
    ): Promise<MutationResult<T>> {
      assertSafeIdentifier(table)
      // The documented bare-create pattern — create('table', { ...fields }) with
      // no explicit id — relies on the row getting an id. A hand-written
      // migration may declare `id uuid NOT NULL` with no DEFAULT, so generate
      // one when the caller omits it (no-op when supplied; composite-PK join
      // tables without an id column are handled by the engine's own error).
      if (data.id == null) {
        data = { id: randomUUID(), ...data }
      }
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const columns = keys.map((k) => `"${k}"`).join(', ')
      const placeholders = keys.map(() => '?').join(', ')
      const values = keys.map((k) => data[k])

      const result = await queryOn<T>(
        table,
        `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING *`,
        values,
      )
      return { data: result.rows[0] ?? null, affected: result.rowCount ?? 0 }
    },

    async updateById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
      data: Record<string, unknown>,
    ): Promise<MutationResult<T>> {
      assertSafeIdentifier(table)
      const keys = Object.keys(data)
      // No-op when there are no fields to update — return the existing row
      // so callers see `affected: 1` for known-id reads (parity with the
      // postgres/sqlite bonds). Issuing an UPDATE with an empty SET clause is
      // a SQL syntax error.
      if (keys.length === 0) {
        const existing = await queryOn<T>(
          table,
          `SELECT * FROM "${table}" WHERE "id" = ? LIMIT 1`,
          [id],
        )
        return { data: existing.rows[0] ?? null, affected: existing.rows.length }
      }
      for (const k of keys) assertSafeIdentifier(k)
      const setClauses = keys.map((k) => `"${k}" = ?`).join(', ')
      const values = [...keys.map((k) => data[k]), id]

      const result = await queryOn<T>(
        table,
        `UPDATE "${table}" SET ${setClauses} WHERE "id" = ? RETURNING *`,
        values,
      )
      return { data: result.rows[0] ?? null, affected: result.rowCount ?? 0 }
    },

    async updateMany(
      table: string,
      where: WhereCondition[],
      data: Record<string, unknown>,
    ): Promise<MutationResult> {
      assertWhereConditions(where, 'updateMany')
      // Refuse an empty WHERE — parity with the postgres/sqlite bonds; an empty
      // `where` would become an UNSCOPED full-table UPDATE.
      if (where.length === 0) {
        throw new Error(
          'updateMany requires at least one WHERE condition to prevent accidental full-table updates',
        )
      }
      assertSafeIdentifier(table)
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const setClauses = keys.map((k) => `"${k}" = ?`).join(', ')
      const setValues = keys.map((k) => data[k])

      const { clause, values: whereValues } = buildWhere(where)
      const values = [...setValues, ...whereValues]

      const result = await queryOn(table, `UPDATE "${table}" SET ${setClauses} ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteById(table: string, id: string | number): Promise<MutationResult> {
      assertSafeIdentifier(table)
      const result = await queryOn(table, `DELETE FROM "${table}" WHERE "id" = ?`, [id])
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
      assertWhereConditions(where, 'deleteMany')
      // Refuse an empty WHERE — parity with the postgres/sqlite bonds (else an
      // empty `where` becomes an UNSCOPED full-table DELETE).
      if (where.length === 0) {
        throw new Error(
          'deleteMany requires at least one WHERE condition to prevent accidental full-table deletes',
        )
      }
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where)
      const result = await queryOn(table, `DELETE FROM "${table}" ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },
  }
}
