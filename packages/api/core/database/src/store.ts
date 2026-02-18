/**
 * Abstract data store interface.
 *
 * Database-agnostic CRUD operations. Each database bond
 * (PostgreSQL, MongoDB, DynamoDB, etc.) implements these
 * methods using its native query language.
 *
 * For complex queries not covered by this interface,
 * use the raw DatabasePool.query() method instead.
 *
 * @module
 */

/**
 * Filter condition for queries.
 */
export interface WhereCondition {
  field: string
  operator:
    | '='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | 'in'
    | 'not_in'
    | 'like'
    | 'is_null'
    | 'is_not_null'
  value?: unknown
}

/**
 * Column sort order (field name and ascending/descending direction).
 */
export interface OrderBy {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Options for findMany queries.
 */
export interface FindManyOptions {
  where?: WhereCondition[]
  orderBy?: OrderBy[]
  limit?: number
  offset?: number
  select?: string[]
}

/**
 * Result of a mutation operation.
 */
export interface MutationResult<T = Record<string, unknown>> {
  /** The affected/returned row, if any. */
  data: T | null
  /** Number of rows affected. */
  affected: number
}

/**
 * Abstract data store interface.
 *
 * Provides database-agnostic CRUD methods. Each database bond
 * implements these using its native query language.
 */
export interface DataStore {
  /**
   * Find a single record by its primary key.
   */
  findById<T = Record<string, unknown>>(table: string, id: string | number): Promise<T | null>

  /**
   * Find a single record matching conditions.
   */
  findOne<T = Record<string, unknown>>(table: string, where: WhereCondition[]): Promise<T | null>

  /**
   * Find many records with filtering, sorting, and pagination.
   */
  findMany<T = Record<string, unknown>>(table: string, options?: FindManyOptions): Promise<T[]>

  /**
   * Count records matching conditions.
   */
  count(table: string, where?: WhereCondition[]): Promise<number>

  /**
   * Insert a new record. Returns the inserted row.
   */
  create<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown>,
  ): Promise<MutationResult<T>>

  /**
   * Update a record by primary key. Returns the updated row.
   */
  updateById<T = Record<string, unknown>>(
    table: string,
    id: string | number,
    data: Record<string, unknown>,
  ): Promise<MutationResult<T>>

  /**
   * Update records matching conditions.
   */
  updateMany(
    table: string,
    where: WhereCondition[],
    data: Record<string, unknown>,
  ): Promise<MutationResult>

  /**
   * Delete a record by primary key.
   */
  deleteById(table: string, id: string | number): Promise<MutationResult>

  /**
   * Delete records matching conditions.
   */
  deleteMany(table: string, where: WhereCondition[]): Promise<MutationResult>
}
