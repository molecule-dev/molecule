/**
 * PostgreSQL DataStore implementation.
 *
 * Translates abstract DataStore CRUD methods to SQL queries.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import type {
  DatabasePool,
  DataStore,
  FindManyOptions,
  MutationResult,
  WhereCondition,
} from '@molecule/api-database'

/**
 * Builds a SQL WHERE clause from WhereCondition[].
 *
 * @param conditions - The WHERE conditions to translate into SQL.
 * @param startIndex - The starting `$N` parameter index (default: 1).
 * @returns An object with the SQL `clause` string and `values` array for parameterized queries.
 */
function buildWhere(
  conditions: WhereCondition[],
  startIndex = 1,
): { clause: string; values: unknown[] } {
  if (conditions.length === 0) {
    return { clause: '', values: [] }
  }

  const parts: string[] = []
  const values: unknown[] = []
  let paramIdx = startIndex

  for (const cond of conditions) {
    assertSafeIdentifier(cond.field)
    switch (cond.operator) {
      case '=':
      case '!=':
      case '>':
      case '<':
      case '>=':
      case '<=':
        parts.push(`"${cond.field}" ${cond.operator} $${paramIdx}`)
        values.push(cond.value)
        paramIdx++
        break
      case 'in':
        if (!Array.isArray(cond.value)) {
          // Fail with the same actionable message as the sqlite/mysql bonds instead
          // of pg's cryptic runtime "op ANY/ALL (array) requires array" error.
          throw new Error(
            `'${cond.operator}' operator requires an array value (field "${cond.field}")`,
          )
        }
        parts.push(`"${cond.field}" = ANY($${paramIdx})`)
        values.push(cond.value)
        paramIdx++
        break
      case 'not_in':
        if (!Array.isArray(cond.value)) {
          throw new Error(
            `'${cond.operator}' operator requires an array value (field "${cond.field}")`,
          )
        }
        parts.push(`"${cond.field}" != ALL($${paramIdx})`)
        values.push(cond.value)
        paramIdx++
        break
      case 'like':
        // Case-insensitive RAW pattern match — the caller supplies the full SQL
        // pattern (their own %/_ wildcards are honored, NOT escaped). Postgres's
        // native LIKE is case-SENSITIVE, so this uses ILIKE to align with the
        // sqlite/mysql bonds' case-insensitive default — see the `like` contract
        // documented on `WhereCondition['operator']` in `@molecule/api-database`.
        // Previously this bond escaped %/_/\ in the value, silently turning `like`
        // into an exact-match operator here only: the fleet's `{ operator: 'like',
        // value: `%${search}%` }` search filters matched NOTHING on postgres while
        // working on sqlite/mysql. Use `ilike` for a safe literal-substring search.
        // ESCAPE '\' pins backslash as THE escape character in the caller's own
        // pattern (postgres's own default, made explicit) so a literal `\%`/`\_`
        // means the same thing here as it does via the sqlite/mysql bonds' `like`.
        parts.push(`"${cond.field}" ILIKE $${paramIdx} ESCAPE '\\'`)
        values.push(cond.value)
        paramIdx++
        break
      case 'ilike':
        // Case-insensitive contains: caller passes the literal substring,
        // we escape its LIKE metacharacters and wrap with `%…%` so the
        // operator is safe to feed user input (no wildcard injection).
        parts.push(`"${cond.field}" ILIKE $${paramIdx} ESCAPE '\\'`)
        values.push(`%${String(cond.value).replace(/[%_\\]/g, '\\$&')}%`)
        paramIdx++
        break
      case 'is_null':
        parts.push(`"${cond.field}" IS NULL`)
        break
      case 'is_not_null':
        parts.push(`"${cond.field}" IS NOT NULL`)
        break
      default:
        throw new Error(`Invalid SQL operator: ${String((cond as { operator: unknown }).operator)}`)
    }
  }

  return { clause: `WHERE ${parts.join(' AND ')}`, values }
}

/**
 * Builds an ORDER BY clause from OrderBy[].
 * @param orderBy - Array of field/direction sort specifications.
 * @returns An SQL `ORDER BY` clause string, or an empty string if no sort is specified.
 */
/** Validates that an identifier (table/column name) is safe for SQL interpolation. */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Validates that a SQL identifier (table or column name) is safe for interpolation.
 * @param name - The identifier string to validate.
 */
function assertSafeIdentifier(name: string): void {
  if (!SAFE_IDENTIFIER.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`)
  }
}

/**
 * Builds an ORDER BY clause from an array of sort specifications.
 * @param orderBy - Array of field/direction sort specifications.
 * @returns An SQL `ORDER BY` clause string, or an empty string if no sort is specified.
 */
function buildOrderBy(orderBy?: { field: string; direction: 'asc' | 'desc' }[]): string {
  if (!orderBy || orderBy.length === 0) return ''
  return `ORDER BY ${orderBy
    .map((o) => {
      assertSafeIdentifier(o.field)
      // Whitelist the direction to exactly ASC/DESC — never interpolate an
      // arbitrary `toUpperCase()` of caller input into the SQL string (parity
      // with the sqlite bond; closes the ORDER BY interpolation sink).
      const dir = o.direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
      return `"${o.field}" ${dir}`
    })
    .join(', ')}`
}

/**
 * Creates a DataStore backed by a PostgreSQL DatabasePool.
 *
 * @example
 * ```typescript
 * import { pool } from '`@molecule/api-database-postgresql`'
 * import { createStore } from '`@molecule/api-database-postgresql`'
 *
 * const store = createStore(pool)
 * const user = await store.findById('users', '123')
 * ```
 *
 * @param pool - The PostgreSQL `DatabasePool` to use for queries.
 * @returns A `DataStore` that translates CRUD operations to SQL queries.
 */
export function createStore(pool: DatabasePool): DataStore {
  // Cache of "does this table have an `id` column" so we don't re-introspect per insert.
  const hasIdColumnCache = new Map<string, boolean>()
  // Cache of a table's json/jsonb columns so writes serialize JS objects/arrays
  // to JSON strings instead of letting node-pg mangle them (see below).
  const jsonColumnsCache = new Map<string, Set<string>>()
  /**
   * Returns whether `table` has an `id` column (cached), used to decide if `create()`
   * should auto-generate an id when the caller omits one.
   * @param table - The table name to introspect.
   * @returns True if the table has an `id` column.
   */
  async function tableHasIdColumn(table: string): Promise<boolean> {
    const cached = hasIdColumnCache.get(table)
    if (cached !== undefined) return cached
    const result = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND column_name = 'id' LIMIT 1`,
      [table],
    )
    const has = (result.rows?.length ?? 0) > 0
    hasIdColumnCache.set(table, has)
    return has
  }

  /**
   * Returns the set of `table`'s json/jsonb column names (cached).
   * @param table - The table name to introspect.
   * @returns A set of column names whose data type is json or jsonb.
   */
  async function tableJsonColumns(table: string): Promise<Set<string>> {
    const cached = jsonColumnsCache.get(table)
    if (cached !== undefined) return cached
    const result = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1 AND data_type IN ('json', 'jsonb')`,
      [table],
    )
    const cols = new Set((result.rows ?? []).map((r) => r.column_name))
    jsonColumnsCache.set(table, cols)
    return cols
  }

  /**
   * Serializes write values for json/jsonb columns. node-pg serializes a JS
   * array as a Postgres ARRAY literal (`{"...","..."}`) and a plain object via
   * its own toPostgres — BOTH of which jsonb rejects (`22P02 invalid input
   * syntax for type json`, e.g. an invoice's `items jsonb` line-item array
   * arriving as `{"{\"description\":…}"}`). JSON-stringifying up front makes
   * the parameter a valid JSON document pg stores verbatim. Values for other
   * column types pass through untouched (driver handles dates, buffers, and
   * real Postgres array columns).
   * @param table - The table being written to.
   * @param data - The column/value map about to be sent.
   * @returns The same map with json/jsonb column values JSON-stringified.
   */
  async function serializeJsonValues(
    table: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Gate the introspection query on an actual object/array value so plain
    // scalar writes never pay the extra round-trip.
    if (!Object.values(data).some((v) => v !== null && typeof v === 'object')) return data
    const jsonCols = await tableJsonColumns(table)
    if (jsonCols.size === 0) return data
    const out: Record<string, unknown> = { ...data }
    for (const key of Object.keys(out)) {
      const value = out[key]
      if (value !== null && typeof value === 'object' && jsonCols.has(key)) {
        out[key] = JSON.stringify(value)
      }
    }
    return out
  }

  return {
    async findById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      const result = await pool.query<T>(`SELECT * FROM "${table}" WHERE "id" = $1 LIMIT 1`, [id])
      return result.rows[0] ?? null
    },

    async findOne<T = Record<string, unknown>>(
      table: string,
      where: WhereCondition[],
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where)
      const result = await pool.query<T>(`SELECT * FROM "${table}" ${clause} LIMIT 1`, values)
      return result.rows[0] ?? null
    },

    async findMany<T = Record<string, unknown>>(
      table: string,
      options?: FindManyOptions,
    ): Promise<T[]> {
      assertSafeIdentifier(table)
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
        Math.min(options?.limit ?? MAX_DEFAULT_LIMIT, MAX_DEFAULT_LIMIT),
      )
      const limit = `LIMIT ${effectiveLimit}`
      // Validate offset as non-negative integer to prevent SQL injection
      const safeOffset =
        options?.offset != null ? Math.max(0, Math.floor(Number(options.offset))) : 0
      const offset = safeOffset > 0 ? `OFFSET ${safeOffset}` : ''

      const sql =
        `SELECT ${selectFields} FROM "${table}" ${clause} ${orderBy} ${limit} ${offset}`.trim()
      const result = await pool.query<T>(sql, values)
      return result.rows
    },

    async count(table: string, where?: WhereCondition[]): Promise<number> {
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where ?? [])
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS "count" FROM "${table}" ${clause}`,
        values,
      )
      return parseInt(result.rows[0]?.count ?? '0', 10)
    },

    async create<T = Record<string, unknown>>(
      table: string,
      data: Record<string, unknown>,
    ): Promise<MutationResult<T>> {
      assertSafeIdentifier(table)
      // The documented bare-create pattern — create('table', { ...fields }) with no
      // explicit id — relies on the row getting an id. The molecule id convention is a
      // uuid PK, but a hand-written migration may declare `id uuid NOT NULL` with no DB
      // default (resource tables generate it in code via createResource; custom handlers
      // don't), so a bare insert would violate NOT NULL. Generate one when the caller
      // omits it AND the table actually has an `id` column — composite-PK join tables
      // (no id column) are left untouched. No-op when the caller already supplies id.
      if (data.id == null && (await tableHasIdColumn(table))) {
        data = { id: randomUUID(), ...data }
      }
      data = await serializeJsonValues(table, data)
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const columns = keys.map((k) => `"${k}"`).join(', ')
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
      const values = keys.map((k) => data[k])

      const result = await pool.query<T>(
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
      // so callers see `affected: 1` for known-id reads. Issuing an UPDATE
      // with an empty SET clause produces a SQL syntax error, which is a
      // surprising failure mode for handlers that strip every input field
      // via Zod `.partial().pick({...})` and end up passing `{}` here.
      if (keys.length === 0) {
        const existing = await pool.query<T>(`SELECT * FROM "${table}" WHERE "id" = $1`, [id])
        return { data: existing.rows[0] ?? null, affected: existing.rowCount ?? 0 }
      }
      for (const k of keys) assertSafeIdentifier(k)
      data = await serializeJsonValues(table, data)
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
      const values = [...keys.map((k) => data[k]), id]

      const result = await pool.query<T>(
        `UPDATE "${table}" SET ${setClauses} WHERE "id" = $${keys.length + 1} RETURNING *`,
        values,
      )
      return { data: result.rows[0] ?? null, affected: result.rowCount ?? 0 }
    },

    async updateMany(
      table: string,
      where: WhereCondition[],
      data: Record<string, unknown>,
    ): Promise<MutationResult> {
      if (where.length === 0) {
        throw new Error(
          'updateMany requires at least one WHERE condition to prevent accidental full-table updates',
        )
      }
      assertSafeIdentifier(table)
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      data = await serializeJsonValues(table, data)
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
      const setValues = keys.map((k) => data[k])

      const { clause, values: whereValues } = buildWhere(where, keys.length + 1)
      const values = [...setValues, ...whereValues]

      const result = await pool.query(`UPDATE "${table}" SET ${setClauses} ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteById(table: string, id: string | number): Promise<MutationResult> {
      assertSafeIdentifier(table)
      const result = await pool.query(`DELETE FROM "${table}" WHERE "id" = $1`, [id])
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
      if (where.length === 0) {
        throw new Error(
          'deleteMany requires at least one WHERE condition to prevent accidental full-table deletes',
        )
      }
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where)
      const result = await pool.query(`DELETE FROM "${table}" ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },
  }
}
