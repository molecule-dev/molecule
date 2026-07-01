/**
 * MySQL DataStore implementation.
 *
 * Translates abstract DataStore CRUD methods to MySQL-compatible SQL:
 * backtick-quoted identifiers (valid regardless of `sql_mode`), `?`
 * placeholders, and — because MySQL has no `RETURNING` — mutations re-read the
 * affected row by id. Before this store existed the bond shipped only a pool,
 * so a MySQL-scaffolded app compiled but every handler's `findOne`/`create`
 * threw "store not bonded" at runtime (caught by the capability contract
 * tests).
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

import { pool as defaultPool } from './provider.js'

/** Validates that an identifier (table/column name) is safe for SQL interpolation. */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Validates that a SQL identifier (table or column name) is safe for interpolation.
 *
 * Table/column names cannot be bound as `?` placeholders, so they are interpolated
 * directly into the SQL string. Any value that reaches an interpolation point MUST be
 * validated here — the whitelist of plain `[A-Za-z_][A-Za-z0-9_]*` identifiers makes
 * the backtick quoting unbreakable.
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
        parts.push(`\`${cond.field}\` ${cond.operator} ?`)
        values.push(cond.value)
        break
      case 'in': {
        const arr = cond.value as unknown[]
        const placeholders = arr.map(() => '?').join(', ')
        parts.push(`\`${cond.field}\` IN (${placeholders})`)
        values.push(...arr)
        break
      }
      case 'not_in': {
        const arr = cond.value as unknown[]
        const placeholders = arr.map(() => '?').join(', ')
        parts.push(`\`${cond.field}\` NOT IN (${placeholders})`)
        values.push(...arr)
        break
      }
      case 'like':
        parts.push(`\`${cond.field}\` LIKE ?`)
        values.push(cond.value)
        break
      case 'ilike':
        // MySQL's default collations already compare case-insensitively, but
        // LOWER() both sides so the contract holds on case-sensitive (_bin/_cs)
        // collations too.
        parts.push(`LOWER(\`${cond.field}\`) LIKE LOWER(?)`)
        values.push(cond.value)
        break
      case 'is_null':
        parts.push(`\`${cond.field}\` IS NULL`)
        break
      case 'is_not_null':
        parts.push(`\`${cond.field}\` IS NOT NULL`)
        break
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
      return `\`${o.field}\` ${dir}`
    })
    .join(', ')}`
}

/**
 * Creates a DataStore backed by a MySQL DatabasePool.
 *
 * @param pool - The MySQL DatabasePool to use for queries.
 * @returns A DataStore that translates CRUD operations to MySQL-compatible SQL.
 */
export function createStore(pool: DatabasePool): DataStore {
  // Cache of "does this table have an `id` column" so we don't re-introspect per insert.
  const hasIdColumnCache = new Map<string, boolean>()
  /**
   * Returns whether `table` has an `id` column (cached), used to decide if `create()`
   * should auto-generate an id when the caller omits one.
   *
   * @param table - The table name to introspect.
   * @returns True if the table has an `id` column.
   */
  async function tableHasIdColumn(table: string): Promise<boolean> {
    const cached = hasIdColumnCache.get(table)
    if (cached !== undefined) return cached
    const result = await pool.query(
      `SELECT 1 AS x FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'id' LIMIT 1`,
      [table],
    )
    const has = (result.rows?.length ?? 0) > 0
    hasIdColumnCache.set(table, has)
    return has
  }

  /**
   * Re-reads a row by id — MySQL has no `RETURNING`, so mutations that promise
   * the affected row fetch it in a second query.
   *
   * @param table - The (already validated) table name.
   * @param id - The row id.
   * @returns The row, or null when it does not exist.
   */
  async function readById<T>(table: string, id: string | number): Promise<T | null> {
    const result = await pool.query<T>(`SELECT * FROM \`${table}\` WHERE \`id\` = ? LIMIT 1`, [id])
    return result.rows[0] ?? null
  }

  return {
    async findById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      return readById<T>(table, id)
    },

    async findOne<T = Record<string, unknown>>(
      table: string,
      where: WhereCondition[],
    ): Promise<T | null> {
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where)
      const result = await pool.query<T>(`SELECT * FROM \`${table}\` ${clause} LIMIT 1`, values)
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
            return `\`${s}\``
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
        `SELECT ${selectFields} FROM \`${table}\` ${clause} ${orderBy} ${limit} ${offset}`.trim()
      const result = await pool.query<T>(sql, values)
      return result.rows
    },

    async count(table: string, where?: WhereCondition[]): Promise<number> {
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where ?? [])
      const result = await pool.query<{ count: number }>(
        `SELECT COUNT(*) AS \`count\` FROM \`${table}\` ${clause}`,
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
      // explicit id — relies on the row getting an id. Generate one when the caller
      // omits it AND the table actually has an `id` column — composite-PK join tables
      // (no id column) are left untouched. No-op when the caller already supplies id.
      if (data.id == null && (await tableHasIdColumn(table))) {
        data = { id: randomUUID(), ...data }
      }
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const columns = keys.map((k) => `\`${k}\``).join(', ')
      const placeholders = keys.map(() => '?').join(', ')
      const values = keys.map((k) => data[k])

      const result = await pool.query(
        `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`,
        values,
      )
      const row = data.id != null ? await readById<T>(table, data.id as string | number) : null
      return { data: row, affected: result.rowCount ?? 0 }
    },

    async updateById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
      data: Record<string, unknown>,
    ): Promise<MutationResult<T>> {
      assertSafeIdentifier(table)
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ')
      const values = [...keys.map((k) => data[k]), id]

      const result = await pool.query(
        `UPDATE \`${table}\` SET ${setClauses} WHERE \`id\` = ?`,
        values,
      )
      return { data: await readById<T>(table, id), affected: result.rowCount ?? 0 }
    },

    async updateMany(
      table: string,
      where: WhereCondition[],
      data: Record<string, unknown>,
    ): Promise<MutationResult> {
      // Refuse an empty WHERE — parity with the postgres/sqlite bonds. buildWhere([])
      // emits an empty clause, so without this an empty `where` becomes an UNSCOPED
      // full-table UPDATE.
      if (where.length === 0) {
        throw new Error(
          'updateMany requires at least one WHERE condition to prevent accidental full-table updates',
        )
      }
      assertSafeIdentifier(table)
      const keys = Object.keys(data)
      for (const k of keys) assertSafeIdentifier(k)
      const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ')
      const setValues = keys.map((k) => data[k])

      const { clause, values: whereValues } = buildWhere(where)
      const values = [...setValues, ...whereValues]

      const result = await pool.query(`UPDATE \`${table}\` SET ${setClauses} ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteById(table: string, id: string | number): Promise<MutationResult> {
      assertSafeIdentifier(table)
      const result = await pool.query(`DELETE FROM \`${table}\` WHERE \`id\` = ?`, [id])
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
      // Refuse an empty WHERE — parity with the postgres/sqlite bonds (else an empty
      // `where` becomes an UNSCOPED full-table DELETE).
      if (where.length === 0) {
        throw new Error(
          'deleteMany requires at least one WHERE condition to prevent accidental full-table deletes',
        )
      }
      assertSafeIdentifier(table)
      const { clause, values } = buildWhere(where)
      const result = await pool.query(`DELETE FROM \`${table}\` ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },
  }
}

/** Lazily-created default store instance. */
let _store: DataStore | undefined

/**
 * The MySQL-backed DataStore singleton over the default pool. Wired at startup
 * via `setStore(store)` from `@molecule/api-database`, mirroring the
 * postgresql/sqlite bonds so the injector's setter/provider pairing
 * (`setStore` → `store`) finds it.
 */
export const store: DataStore = new Proxy({} as DataStore, {
  get(_target, prop: string | symbol) {
    _store ??= createStore(defaultPool)
    return _store[prop as keyof DataStore]
  },
})
