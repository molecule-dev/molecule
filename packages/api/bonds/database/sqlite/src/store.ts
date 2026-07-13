/**
 * SQLite DataStore implementation.
 *
 * Translates abstract DataStore CRUD methods to SQLite-compatible SQL queries.
 * Uses ? placeholders instead of PostgreSQL's $N placeholders.
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

/** Validates that an identifier (table/column name) is safe for SQL interpolation. */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Validates that a SQL identifier (table or column name) is safe for interpolation.
 *
 * Table/column names cannot be bound as `?` placeholders, so they are interpolated
 * directly into the SQL string. Any value that reaches an interpolation point MUST be
 * validated here — otherwise a caller passing a user-supplied identifier (e.g. a
 * `sort_by` column from a query string) opens a SQL-injection hole. The whitelist of
 * plain `[A-Za-z_][A-Za-z0-9_]*` identifiers makes the `"..."` quoting unbreakable.
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
          // `IN ()` is a SQLite syntax error; match Postgres `= ANY('{}')` semantics: no match.
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
          // `NOT IN ()` is a SQLite syntax error; match Postgres `!= ALL('{}')`: everything matches.
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
        // both sides so the contract holds even when `PRAGMA case_sensitive_like`
        // is set (SQLite's native LIKE is only case-insensitive for ASCII by
        // default — that pragma is mutable) — see the `like` contract documented
        // on `WhereCondition['operator']` in `@molecule/api-database`; it must be
        // IDENTICAL across every bond. ESCAPE '\' pins backslash as THE escape
        // character in the caller's pattern — UNLIKE postgres/mysql, SQLite's
        // LIKE has NO escape character at all without an explicit ESCAPE clause
        // (a literal backslash would otherwise mean something different here
        // than on the other two bonds).
        parts.push(`LOWER("${cond.field}") LIKE LOWER(?) ESCAPE '\\'`)
        values.push(cond.value)
        break
      case 'ilike':
        // Case-insensitive CONTAINS on a literal substring — the documented core
        // contract (`@molecule/api-database` WhereCondition): escape the value's
        // LIKE metacharacters, wrap with `%…%`. LOWER() both sides so the contract
        // holds even under `PRAGMA case_sensitive_like`. This case was MISSING:
        // an `ilike` condition was silently dropped from the WHERE clause (search
        // returned every row) or, when it was the only condition, produced a bare
        // `WHERE` and a cryptic `near "LIMIT": syntax error`.
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
        // Parity with the postgres bond: an unknown operator must FAIL LOUDLY, not
        // silently drop the condition (which would return unfiltered rows).
        throw new Error(`Invalid SQL operator: ${String((cond as { operator: unknown }).operator)}`)
    }
  }

  return { clause: `WHERE ${parts.join(' AND ')}`, values }
}

/**
 * Builds an ORDER BY clause.
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
 * Creates a DataStore backed by a SQLite DatabasePool.
 *
 * @param pool - The SQLite DatabasePool to use for queries.
 * @returns A DataStore that translates CRUD operations to SQLite-compatible SQL.
 */
export function createStore(pool: DatabasePool): DataStore {
  // Cache of "does this table have an `id` column" so we don't re-introspect per insert.
  const hasIdColumnCache = new Map<string, boolean>()
  /**
   * Returns whether `table` has an `id` column (cached), used to decide if `create()`
   * should auto-generate an id when the caller omits one.
   * @param table - The table name to introspect.
   * @returns True if the table has an `id` column.
   */
  async function tableHasIdColumn(table: string): Promise<boolean> {
    const cached = hasIdColumnCache.get(table)
    if (cached !== undefined) return cached
    const result = await pool.query<{ x: number }>(
      `SELECT 1 AS x FROM pragma_table_info(?) WHERE name = 'id' LIMIT 1`,
      [table],
    )
    const has = (result.rows?.length ?? 0) > 0
    hasIdColumnCache.set(table, has)
    return has
  }

  return {
    async findById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      const result = await pool.query<T>(`SELECT * FROM "${table}" WHERE "id" = ? LIMIT 1`, [id])
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
        Math.min(Number(options?.limit ?? MAX_DEFAULT_LIMIT), MAX_DEFAULT_LIMIT),
      )
      const limit = `LIMIT ${effectiveLimit}`
      // Validate offset as a non-negative integer to prevent SQL injection.
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
      const result = await pool.query<{ count: number }>(
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
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const columns = keys.map((k) => `"${k}"`).join(', ')
      const placeholders = keys.map(() => '?').join(', ')
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
      // so callers see `affected: 1` for known-id reads (parity with the
      // postgres bond). Issuing an UPDATE with an empty SET clause is a SQL
      // syntax error, which is a surprising failure mode for handlers that
      // strip every input field via Zod `.partial().pick({...})` and end up
      // passing `{}` here.
      if (keys.length === 0) {
        const existing = await pool.query<T>(`SELECT * FROM "${table}" WHERE "id" = ? LIMIT 1`, [
          id,
        ])
        return { data: existing.rows[0] ?? null, affected: existing.rowCount ?? 0 }
      }
      for (const k of keys) assertSafeIdentifier(k)
      const setClauses = keys.map((k) => `"${k}" = ?`).join(', ')
      const values = [...keys.map((k) => data[k]), id]

      const result = await pool.query<T>(
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
      // [M7-3] Refuse an empty WHERE — parity with the postgres bond. buildWhere([]) emits an
      // empty clause, so without this an empty `where` becomes an UNSCOPED full-table UPDATE.
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

      const result = await pool.query(`UPDATE "${table}" SET ${setClauses} ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteById(table: string, id: string | number): Promise<MutationResult> {
      assertSafeIdentifier(table)
      const result = await pool.query(`DELETE FROM "${table}" WHERE "id" = ?`, [id])
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
      // [M7-3] Refuse an empty WHERE — parity with the postgres bond (else an empty `where`
      // becomes an UNSCOPED full-table DELETE).
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
