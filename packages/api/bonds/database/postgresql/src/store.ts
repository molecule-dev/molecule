/**
 * PostgreSQL DataStore implementation.
 *
 * Translates abstract DataStore CRUD methods to SQL queries.
 *
 * @module
 */

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
        parts.push(`"${cond.field}" = ANY($${paramIdx})`)
        values.push(cond.value)
        paramIdx++
        break
      case 'not_in':
        parts.push(`"${cond.field}" != ALL($${paramIdx})`)
        values.push(cond.value)
        paramIdx++
        break
      case 'like':
        parts.push(`"${cond.field}" LIKE $${paramIdx}`)
        values.push(cond.value)
        paramIdx++
        break
      case 'is_null':
        parts.push(`"${cond.field}" IS NULL`)
        break
      case 'is_not_null':
        parts.push(`"${cond.field}" IS NOT NULL`)
        break
    }
  }

  return { clause: `WHERE ${parts.join(' AND ')}`, values }
}

/**
 * Builds an ORDER BY clause from OrderBy[].
 * @param orderBy - Array of field/direction sort specifications.
 * @returns An SQL `ORDER BY` clause string, or an empty string if no sort is specified.
 */
function buildOrderBy(orderBy?: { field: string; direction: 'asc' | 'desc' }[]): string {
  if (!orderBy || orderBy.length === 0) return ''
  return `ORDER BY ${orderBy.map((o) => `"${o.field}" ${o.direction.toUpperCase()}`).join(', ')}`
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
  return {
    async findById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
    ): Promise<T | null> {
      const result = await pool.query<T>(`SELECT * FROM "${table}" WHERE "id" = $1 LIMIT 1`, [id])
      return result.rows[0] ?? null
    },

    async findOne<T = Record<string, unknown>>(
      table: string,
      where: WhereCondition[],
    ): Promise<T | null> {
      const { clause, values } = buildWhere(where)
      const result = await pool.query<T>(`SELECT * FROM "${table}" ${clause} LIMIT 1`, values)
      return result.rows[0] ?? null
    },

    async findMany<T = Record<string, unknown>>(
      table: string,
      options?: FindManyOptions,
    ): Promise<T[]> {
      const { clause, values } = buildWhere(options?.where ?? [])
      const selectFields = options?.select?.map((s) => `"${s}"`).join(', ') ?? '*'
      const orderBy = buildOrderBy(options?.orderBy)
      const limit = options?.limit ? `LIMIT ${options.limit}` : ''
      const offset = options?.offset ? `OFFSET ${options.offset}` : ''

      const sql =
        `SELECT ${selectFields} FROM "${table}" ${clause} ${orderBy} ${limit} ${offset}`.trim()
      const result = await pool.query<T>(sql, values)
      return result.rows
    },

    async count(table: string, where?: WhereCondition[]): Promise<number> {
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
      const keys = Object.keys(data)
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
      const keys = Object.keys(data)
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
      const keys = Object.keys(data)
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
      const setValues = keys.map((k) => data[k])

      const { clause, values: whereValues } = buildWhere(where, keys.length + 1)
      const values = [...setValues, ...whereValues]

      const result = await pool.query(`UPDATE "${table}" SET ${setClauses} ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteById(table: string, id: string | number): Promise<MutationResult> {
      const result = await pool.query(`DELETE FROM "${table}" WHERE "id" = $1`, [id])
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
      const { clause, values } = buildWhere(where)
      const result = await pool.query(`DELETE FROM "${table}" ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },
  }
}
