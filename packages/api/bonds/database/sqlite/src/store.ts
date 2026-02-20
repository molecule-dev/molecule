/**
 * SQLite DataStore implementation.
 *
 * Translates abstract DataStore CRUD methods to SQLite-compatible SQL queries.
 * Uses ? placeholders instead of PostgreSQL's $N placeholders.
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
        const placeholders = arr.map(() => '?').join(', ')
        parts.push(`"${cond.field}" IN (${placeholders})`)
        values.push(...arr)
        break
      }
      case 'not_in': {
        const arr = cond.value as unknown[]
        const placeholders = arr.map(() => '?').join(', ')
        parts.push(`"${cond.field}" NOT IN (${placeholders})`)
        values.push(...arr)
        break
      }
      case 'like':
        parts.push(`"${cond.field}" LIKE ?`)
        values.push(cond.value)
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
 * Builds an ORDER BY clause.
 * @param orderBy - Array of field/direction pairs to sort by.
 * @returns A SQL ORDER BY clause string, or an empty string if none provided.
 */
function buildOrderBy(orderBy?: { field: string; direction: 'asc' | 'desc' }[]): string {
  if (!orderBy || orderBy.length === 0) return ''
  return `ORDER BY ${orderBy.map((o) => `"${o.field}" ${o.direction.toUpperCase()}`).join(', ')}`
}

/**
 * Creates a DataStore backed by a SQLite DatabasePool.
 *
 * @param pool - The SQLite DatabasePool to use for queries.
 * @returns A DataStore that translates CRUD operations to SQLite-compatible SQL.
 */
export function createStore(pool: DatabasePool): DataStore {
  return {
    async findById<T = Record<string, unknown>>(
      table: string,
      id: string | number,
    ): Promise<T | null> {
      const result = await pool.query<T>(`SELECT * FROM "${table}" WHERE "id" = ? LIMIT 1`, [id])
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
      const keys = Object.keys(data)
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
      const keys = Object.keys(data)
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
      const keys = Object.keys(data)
      const setClauses = keys.map((k) => `"${k}" = ?`).join(', ')
      const setValues = keys.map((k) => data[k])

      const { clause, values: whereValues } = buildWhere(where)
      const values = [...setValues, ...whereValues]

      const result = await pool.query(`UPDATE "${table}" SET ${setClauses} ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteById(table: string, id: string | number): Promise<MutationResult> {
      const result = await pool.query(`DELETE FROM "${table}" WHERE "id" = ?`, [id])
      return { data: null, affected: result.rowCount ?? 0 }
    },

    async deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult> {
      const { clause, values } = buildWhere(where)
      const result = await pool.query(`DELETE FROM "${table}" ${clause}`, values)
      return { data: null, affected: result.rowCount ?? 0 }
    },
  }
}
