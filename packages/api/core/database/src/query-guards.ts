/**
 * Argument-shape guards for the DataStore query entry points.
 *
 * `findMany(table, options)` takes an options OBJECT — `{ where: [...] }` —
 * while `findOne(table, where)`, `count(table, where?)`, `updateMany(table,
 * where, data)` and `deleteMany(table, where)` take the condition ARRAY
 * itself. A caller that swaps the two shapes is not caught by a `tsx` run
 * (no type-check) and must never be caught by the database: a bare condition
 * array passed to `findMany` is readable as "no options", so `options.where`
 * is `undefined` and the query silently returns EVERY row. A dropped filter is
 * an unscoped read (and, for `updateMany`/`deleteMany`, an unscoped write), so
 * these guards reject the malformed argument with an actionable `TypeError`
 * BEFORE any SQL is built or sent.
 *
 * Bonds call these from their own `createStore()` implementations as well as
 * the convenience functions in `store-provider.ts`, so a direct
 * `store.findMany(...)` caller gets the same contract as `findMany(...)`.
 *
 * @module
 */

import type { FindManyOptions, WhereCondition } from './store.js'

/** The only keys `FindManyOptions` documents; anything else would be ignored. */
const FIND_MANY_OPTION_KEYS: ReadonlySet<string> = new Set([
  'where',
  'orderBy',
  'limit',
  'offset',
  'select',
])

/** The operator vocabulary every bond implements. */
const OPERATORS = '=, !=, >, <, >=, <=, in, not_in, like, ilike, is_null, is_not_null'

/**
 * Whether a value is a plain object (not an array, null, a class instance, a
 * date, or a function) — the only shape the query API accepts.
 *
 * @param value - The value to inspect.
 * @returns True when the value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value) as object | null
  return prototype === Object.prototype || prototype === null
}

/**
 * Names a received value in an error message so a caller can recognize it.
 *
 * @param value - The value that failed validation.
 * @returns A short description such as `an array` or `a string`.
 */
function shapeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  if (typeof value === 'object') return 'a non-plain object'
  return `a ${typeof value}`
}

/**
 * Validates every entry of a condition array.
 *
 * @param conditions - The array to validate.
 * @param label - The argument path named in the thrown error.
 * @throws {TypeError} When an entry is not a `{ field, operator, value }` object.
 */
function assertConditionEntries(
  conditions: unknown[],
  label: string,
): asserts conditions is WhereCondition[] {
  conditions.forEach((condition, index) => {
    const at = `${label}[${index}]`
    if (!isPlainObject(condition)) {
      throw new TypeError(
        `${at} must be an object like { field, operator, value }; got ${shapeOf(condition)}.`,
      )
    }
    if (typeof condition.field !== 'string' || condition.field.length === 0) {
      throw new TypeError(
        `${at}.field must be a non-empty column name string; got ${shapeOf(condition.field)}.`,
      )
    }
    if (typeof condition.operator !== 'string' || condition.operator.length === 0) {
      throw new TypeError(
        `${at}.operator must be one of: ${OPERATORS}; got ${shapeOf(condition.operator)}.`,
      )
    }
  })
}

/**
 * Validates one `where` argument — the array itself, never a wrapper object.
 *
 * @param where - The value the caller passed as conditions.
 * @param label - The argument path named in the thrown error.
 * @param options - `optional: true` accepts `undefined` (no filter).
 * @throws {TypeError} When the value is not an array of condition objects.
 */
function assertConditionArray(
  where: unknown,
  label: string,
  options: { optional?: boolean } = {},
): asserts where is WhereCondition[] | undefined {
  if (where === undefined) {
    if (options.optional) return
    throw new TypeError(
      `${label} is required and must be an ARRAY of { field, operator, value } conditions; got undefined. Pass [] only when you mean to match every row.`,
    )
  }
  if (Array.isArray(where)) {
    assertConditionEntries(where, label)
    return
  }
  if (isPlainObject(where)) {
    const hint =
      'where' in where
        ? ' The object has a `where` key — that is the findMany options shape. findMany takes { where: [...] }; findOne, count, updateMany and deleteMany take the condition array itself.'
        : " It looks like a single condition or a key map. Pass an ARRAY of conditions, e.g. [{ field: 'status', operator: '=', value: 'active' }]."
    throw new TypeError(
      `${label} must be an ARRAY of { field, operator, value } conditions, not an object.${hint}`,
    )
  }
  throw new TypeError(
    `${label} must be an ARRAY of { field, operator, value } conditions; got ${shapeOf(where)}.`,
  )
}

/**
 * Validates a `where` argument for `findOne`, `updateMany` and `deleteMany` —
 * these take the condition array ITSELF (`[{ field, operator, value }]`), never
 * a `{ where: [...] }` options object and never a bare key map.
 *
 * Throws before any query runs, so a malformed filter can never broaden a read
 * or an update into an unscoped one.
 *
 * @param where - The value the caller passed as conditions.
 * @param caller - The method name, used in the error message (`findOne`, …).
 * @throws {TypeError} When `where` is not an array of condition objects.
 */
export function assertWhereConditions(
  where: unknown,
  caller: string,
): asserts where is WhereCondition[] {
  assertConditionArray(where, `${caller}(table, where)`)
}

/**
 * Validates `count`'s optional `where` argument — the condition array ITSELF,
 * or `undefined` for "count every row".
 *
 * @param where - The value the caller passed as conditions.
 * @throws {TypeError} When `where` is not an array of condition objects.
 */
export function assertOptionalWhereConditions(
  where: unknown,
): asserts where is WhereCondition[] | undefined {
  assertConditionArray(where, 'count(table, where)', { optional: true })
}

/**
 * Validates the options object passed to `findMany`.
 *
 * A bare condition array, a single condition object, a key map
 * (`{ speciesId: id }`), a `{ conditions: [...] }`/`{ filter: [...] }` typo, or
 * any other unknown key would otherwise be read as "no filter" and silently
 * return every row. Every one of those now throws an actionable `TypeError`
 * before a query is built.
 *
 * @param options - The value the caller passed as `findMany`'s second argument.
 * @throws {TypeError} When the options object or one of its values is malformed.
 */
export function assertFindManyOptions(
  options: unknown,
): asserts options is FindManyOptions | undefined {
  const label = 'findMany(table, options)'
  if (options === undefined) return
  if (Array.isArray(options)) {
    throw new TypeError(
      `${label}: the second argument must be an options OBJECT like { where: [{ field, operator, value }] }, not a bare condition array. findOne and count take the condition array itself; findMany wraps it in \`where\` — did you mean { where: [...] }?`,
    )
  }
  if (!isPlainObject(options)) {
    throw new TypeError(
      `${label}: the second argument must be an object like { where: [...] } (or omitted); got ${shapeOf(options)}.`,
    )
  }

  const unexpected = Object.keys(options).filter((key) => !FIND_MANY_OPTION_KEYS.has(key))
  if (unexpected.length > 0) {
    const list = unexpected.map((key) => `"${key}"`).join(', ')
    const looksLikeCondition = unexpected.some(
      (key) => key === 'field' || key === 'operator' || key === 'value',
    )
    const looksLikeFilterAlias = unexpected.some(
      (key) => key === 'conditions' || key === 'filter' || key === 'filters',
    )
    const hint = looksLikeCondition
      ? ' The object looks like a single condition: conditions go in an ARRAY under `where`, e.g. { where: [{ field, operator, value }] }.'
      : looksLikeFilterAlias
        ? ' Filters belong under `where`: { where: [{ field, operator, value }] }.'
        : ' A filter is silently ignored unless it is under `where`; the options are where, orderBy, limit, offset and select.'
    throw new TypeError(`${label}: unknown option(s) ${list}.${hint}`)
  }

  assertConditionArray(options.where, `${label}.where`, { optional: true })

  if (options.orderBy !== undefined) {
    if (!Array.isArray(options.orderBy)) {
      throw new TypeError(
        `${label}.orderBy must be an ARRAY of { field, direction } objects; got ${shapeOf(options.orderBy)}.`,
      )
    }
    const orderBy: unknown[] = options.orderBy
    orderBy.forEach((order, index) => {
      if (!isPlainObject(order) || typeof order.field !== 'string' || order.field.length === 0) {
        throw new TypeError(
          `${label}.orderBy[${index}] must be an object like { field: 'createdAt', direction: 'desc' }.`,
        )
      }
    })
  }

  if (options.select !== undefined) {
    if (!Array.isArray(options.select)) {
      throw new TypeError(
        `${label}.select must be an ARRAY of column names; got ${shapeOf(options.select)}.`,
      )
    }
    const select: unknown[] = options.select
    select.forEach((column, index) => {
      if (typeof column !== 'string' || column.length === 0) {
        throw new TypeError(
          `${label}.select[${index}] must be a non-empty column name string; got ${shapeOf(column)}.`,
        )
      }
    })
  }
}
