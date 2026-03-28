/**
 * SQL query builder for aggregate and time-series reporting queries.
 *
 * Generates parameterized SQL from the abstract reporting query types,
 * preventing SQL injection via identifier sanitization and `$N` placeholders.
 *
 * @module
 */

import type { AggregateQuery, Filter, Measure, OrderBy, TimeSeriesQuery } from './types.js'

/**
 * Result of building a parameterized SQL query.
 */
export interface BuiltQuery {
  /** The SQL text with `$1`, `$2`, … placeholders. */
  sql: string

  /** Parameter values corresponding to the placeholders. */
  params: unknown[]
}

/**
 * Sanitizes an identifier (table or column name) for safe use in SQL.
 * Only allows alphanumeric characters and underscores.
 *
 * @param name - The identifier to sanitize.
 * @returns The sanitized identifier.
 */
export const sanitizeIdentifier = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Builds a SQL aggregate expression for a single measure.
 *
 * @param measure - The measure definition.
 * @returns SQL expression string (e.g., `SUM("revenue") AS "total_revenue"`).
 */
export const buildMeasureExpression = (measure: Measure): string => {
  const alias = sanitizeIdentifier(measure.alias ?? `${measure.field}_${measure.function}`)

  if (measure.field === '*') {
    return `COUNT(*) AS "${alias}"`
  }

  const field = sanitizeIdentifier(measure.field)

  switch (measure.function) {
    case 'count':
      return `COUNT("${field}") AS "${alias}"`
    case 'countDistinct':
      return `COUNT(DISTINCT "${field}") AS "${alias}"`
    case 'sum':
      return `SUM("${field}") AS "${alias}"`
    case 'avg':
      return `AVG("${field}") AS "${alias}"`
    case 'min':
      return `MIN("${field}") AS "${alias}"`
    case 'max':
      return `MAX("${field}") AS "${alias}"`
  }
}

/**
 * Builds a map from measure alias to the raw SQL aggregate expression.
 * Used by HAVING clauses to resolve alias references into valid SQL.
 *
 * @param measures - The measures array from the query.
 * @returns Map of alias name → SQL aggregate expression.
 */
export const buildMeasureAliasMap = (measures: Measure[]): Map<string, string> => {
  const map = new Map<string, string>()

  for (const measure of measures) {
    const alias = measure.alias ?? `${measure.field}_${measure.function}`
    const field = measure.field === '*' ? '*' : `"${sanitizeIdentifier(measure.field)}"`

    let expr: string
    switch (measure.function) {
      case 'count':
        expr = measure.field === '*' ? 'COUNT(*)' : `COUNT(${field})`
        break
      case 'countDistinct':
        expr = `COUNT(DISTINCT ${field})`
        break
      case 'sum':
        expr = `SUM(${field})`
        break
      case 'avg':
        expr = `AVG(${field})`
        break
      case 'min':
        expr = `MIN(${field})`
        break
      case 'max':
        expr = `MAX(${field})`
        break
    }

    map.set(alias, expr)
  }

  return map
}

/**
 * Builds a WHERE or HAVING clause from an array of filters.
 *
 * @param filters - The filter conditions.
 * @param paramOffset - The starting parameter index (`$N`).
 * @param aliasMap - Optional map from alias → SQL expression (for HAVING).
 * @returns The built clause string, parameters, and the next available offset.
 */
export const buildFilterClause = (
  filters: Filter[],
  paramOffset: number,
  aliasMap?: Map<string, string>,
): { clause: string; params: unknown[]; nextOffset: number } => {
  const conditions: string[] = []
  const params: unknown[] = []
  let idx = paramOffset

  for (const filter of filters) {
    const col = aliasMap?.get(filter.field) ?? `"${sanitizeIdentifier(filter.field)}"`

    switch (filter.operator) {
      case 'eq':
        conditions.push(`${col} = $${idx}`)
        params.push(filter.value)
        idx++
        break
      case 'neq':
        conditions.push(`${col} != $${idx}`)
        params.push(filter.value)
        idx++
        break
      case 'gt':
        conditions.push(`${col} > $${idx}`)
        params.push(filter.value)
        idx++
        break
      case 'gte':
        conditions.push(`${col} >= $${idx}`)
        params.push(filter.value)
        idx++
        break
      case 'lt':
        conditions.push(`${col} < $${idx}`)
        params.push(filter.value)
        idx++
        break
      case 'lte':
        conditions.push(`${col} <= $${idx}`)
        params.push(filter.value)
        idx++
        break
      case 'in': {
        const values = filter.value as unknown[]
        const placeholders = values.map((_, i) => `$${idx + i}`).join(', ')
        conditions.push(`${col} IN (${placeholders})`)
        params.push(...values)
        idx += values.length
        break
      }
      case 'notIn': {
        const values = filter.value as unknown[]
        const placeholders = values.map((_, i) => `$${idx + i}`).join(', ')
        conditions.push(`${col} NOT IN (${placeholders})`)
        params.push(...values)
        idx += values.length
        break
      }
      case 'between': {
        const [low, high] = filter.value as [unknown, unknown]
        conditions.push(`${col} BETWEEN $${idx} AND $${idx + 1}`)
        params.push(low, high)
        idx += 2
        break
      }
      case 'like':
        conditions.push(`${col} LIKE $${idx}`)
        params.push(filter.value)
        idx++
        break
    }
  }

  return { clause: conditions.join(' AND '), params, nextOffset: idx }
}

/**
 * Builds an ORDER BY clause from ordering definitions.
 *
 * @param orderBy - The ordering definitions.
 * @returns SQL fragment (without the `ORDER BY` keyword).
 */
export const buildOrderByClause = (orderBy: OrderBy[]): string => {
  return orderBy
    .map((o) => `"${sanitizeIdentifier(o.field)}" ${o.direction === 'asc' ? 'ASC' : 'DESC'}`)
    .join(', ')
}

/**
 * Builds a complete parameterized SQL query for an aggregate report.
 *
 * @param q - The aggregate query definition.
 * @param maxRows - Default maximum rows when no explicit limit is set.
 * @returns The built query with SQL and parameters.
 */
export const buildAggregateSQL = (q: AggregateQuery, maxRows: number): BuiltQuery => {
  const table = sanitizeIdentifier(q.table)
  const params: unknown[] = []
  let paramIdx = 1

  const selectParts: string[] = []
  if (q.dimensions?.length) {
    for (const dim of q.dimensions) {
      selectParts.push(`"${sanitizeIdentifier(dim)}"`)
    }
  }
  for (const measure of q.measures) {
    selectParts.push(buildMeasureExpression(measure))
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM "${table}"`

  if (q.filters?.length) {
    const result = buildFilterClause(q.filters, paramIdx)
    sql += ` WHERE ${result.clause}`
    params.push(...result.params)
    paramIdx = result.nextOffset
  }

  if (q.dimensions?.length) {
    sql += ` GROUP BY ${q.dimensions.map((d) => `"${sanitizeIdentifier(d)}"`).join(', ')}`
  }

  if (q.having?.length) {
    const aliasMap = buildMeasureAliasMap(q.measures)
    const result = buildFilterClause(q.having, paramIdx, aliasMap)
    sql += ` HAVING ${result.clause}`
    params.push(...result.params)
    paramIdx = result.nextOffset
  }

  if (q.orderBy?.length) {
    sql += ` ORDER BY ${buildOrderByClause(q.orderBy)}`
  }

  const limit = q.limit ?? maxRows
  sql += ` LIMIT $${paramIdx}`
  params.push(limit)

  return { sql, params }
}

/**
 * Builds a parameterized SQL query to count total rows for an aggregate query
 * (before LIMIT is applied).
 *
 * @param q - The aggregate query definition.
 * @returns The built count query with SQL and parameters.
 */
export const buildAggregateCountSQL = (q: AggregateQuery): BuiltQuery => {
  const table = sanitizeIdentifier(q.table)
  const params: unknown[] = []
  let paramIdx = 1

  if (q.dimensions?.length) {
    const selectParts: string[] = []
    for (const dim of q.dimensions) {
      selectParts.push(`"${sanitizeIdentifier(dim)}"`)
    }
    for (const measure of q.measures) {
      selectParts.push(buildMeasureExpression(measure))
    }

    let innerSql = `SELECT ${selectParts.join(', ')} FROM "${table}"`

    if (q.filters?.length) {
      const result = buildFilterClause(q.filters, paramIdx)
      innerSql += ` WHERE ${result.clause}`
      params.push(...result.params)
      paramIdx = result.nextOffset
    }

    innerSql += ` GROUP BY ${q.dimensions.map((d) => `"${sanitizeIdentifier(d)}"`).join(', ')}`

    if (q.having?.length) {
      const aliasMap = buildMeasureAliasMap(q.measures)
      const result = buildFilterClause(q.having, paramIdx, aliasMap)
      innerSql += ` HAVING ${result.clause}`
      params.push(...result.params)
    }

    return { sql: `SELECT COUNT(*) AS "total" FROM (${innerSql}) AS _counted`, params }
  }

  let sql = `SELECT COUNT(*) AS "total" FROM "${table}"`

  if (q.filters?.length) {
    const result = buildFilterClause(q.filters, paramIdx)
    sql += ` WHERE ${result.clause}`
    params.push(...result.params)
  }

  return { sql, params }
}

/**
 * Builds a complete parameterized SQL query for a time-series report.
 *
 * @param q - The time-series query definition.
 * @returns The built query with SQL and parameters.
 */
export const buildTimeSeriesSQL = (q: TimeSeriesQuery): BuiltQuery => {
  const table = sanitizeIdentifier(q.table)
  const dateField = sanitizeIdentifier(q.dateField)
  const params: unknown[] = []
  let paramIdx = 1

  const selectParts: string[] = [`date_trunc('${q.interval}', "${dateField}") AS "date"`]
  for (const measure of q.measures) {
    selectParts.push(buildMeasureExpression(measure))
  }

  let sql = `SELECT ${selectParts.join(', ')} FROM "${table}"`

  const filterConditions: string[] = []
  const filterParams: unknown[] = []

  if (q.filters?.length) {
    const result = buildFilterClause(q.filters, paramIdx)
    filterConditions.push(result.clause)
    filterParams.push(...result.params)
    paramIdx = result.nextOffset
  }

  if (q.startDate) {
    filterConditions.push(`"${dateField}" >= $${paramIdx}`)
    filterParams.push(q.startDate)
    paramIdx++
  }

  if (q.endDate) {
    filterConditions.push(`"${dateField}" <= $${paramIdx}`)
    filterParams.push(q.endDate)
  }

  if (filterConditions.length) {
    sql += ` WHERE ${filterConditions.join(' AND ')}`
    params.push(...filterParams)
  }

  sql += ` GROUP BY "date" ORDER BY "date" ASC`

  return { sql, params }
}
