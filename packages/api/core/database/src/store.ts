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
    /**
     * Case-insensitive SQL pattern match. `value` is used AS-IS as the raw
     * LIKE pattern: `%` matches any run of characters, `_` matches any
     * single character, and the CALLER is responsible for escaping any
     * literal `%` / `_` / `\` they don't want treated as wildcards. All
     * three first-party bonds (postgresql, mysql, sqlite) implement `like`
     * case-INSENSITIVELY — postgres via `ILIKE`, mysql/sqlite via
     * `LOWER()` on both sides — specifically so this operator has
     * IDENTICAL results across every bond regardless of column collation
     * or `PRAGMA case_sensitive_like`. Prior to this contract the postgres
     * bond escaped the value (making `like` an exact-match operator there
     * only) while sqlite/mysql passed it through raw — the same `{
     * operator: 'like', value: `%${search}%` }` filter silently matched
     * nothing on postgres and worked everywhere else. For human-typed
     * search input where the value should be a literal substring (not a
     * pattern the caller controls), use `ilike` instead — it escapes
     * wildcards and wraps `%…%` for you, so it is injection-safe for
     * arbitrary user text.
     */
    | 'like'
    /**
     * Case-insensitive substring match. The value is treated as a
     * literal substring (LIKE wildcards in the value are escaped) and
     * the bond wraps it with `%…%` to perform a contains-style match.
     * Use this for human-typed search input where case shouldn't matter.
     */
    | 'ilike'
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
  /**
   * The order the rows come back in, applied before `limit`/`offset`.
   *
   * **Row order is unspecified unless this is given** — see the note on
   * {@link DataStore.findMany}. Pass it for every list whose order the caller
   * depends on, not only for a list that "looks" sorted.
   */
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
   *
   * **Row order is unspecified unless `orderBy` is given.** No bond sorts for
   * you — no database does. The rows come back in whatever order the plan
   * produces: an un-indexed full scan yields heap order (which on SQLite is
   * often insertion order), but a `where` on an INDEXED column — a foreign key
   * like an `articleId`, an `orderId`, a `userId` — is answered from that
   * index, so the rows arrive in the index's order instead. Two rows inserted
   * first/second can therefore come back second/first.
   *
   * So any caller that depends on the order of the rows must pass `orderBy`
   * explicitly — a list a spec asserts (`tagList[0]`, `items[0]`, a `[0]`/`[1]`
   * index anywhere), a join table whose insertion order IS the client's data, a
   * "newest first" feed. `orderBy: [{ field: 'createdAt', direction: 'desc' }]`
   * is the usual one. Never assume the order rows were inserted in, and never
   * assume the order an earlier call happened to return. When the table has no
   * column that encodes the intended order, store one — a `position` integer
   * written from the array index (see `@molecule/api-resource-article`'s
   * `article_tags` and `@molecule/api-resource-order`'s `order_items`).
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
