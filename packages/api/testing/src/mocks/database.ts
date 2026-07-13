/**
 * Mock database implementation for testing.
 *
 * @module
 */

import type {
  DatabaseConnection,
  DatabasePool,
  DatabaseTransaction,
  QueryResult,
} from '@molecule/api-database'

/**
 * Creates a mock database pool for testing.
 * @returns The created instance.
 */
export const createMockDatabase = (): DatabasePool & {
  queries: Array<{ text: string; values?: unknown[] }>
  setQueryResult: <T>(result: QueryResult<T>) => void
  setQueryResultOnce: <T>(result: QueryResult<T>) => void
  reset: () => void
} => {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  let nextResult: QueryResult<unknown> = { rows: [], rowCount: 0 }
  const onceQueue: QueryResult<unknown>[] = []

  // Shared by every query path (pool.query, connection.query, transaction.query):
  // a queued `setQueryResultOnce` result is consumed first (FIFO, one query each),
  // then falls back to the persistent `setQueryResult` result for every query after.
  const nextQueryResult = <T>(): QueryResult<T> => {
    const once = onceQueue.shift()
    return (once ?? nextResult) as QueryResult<T>
  }

  const mockConnection: DatabaseConnection = {
    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      queries.push({ text, values })
      return nextQueryResult<T>()
    },
    release(): void {},
  }

  const mockTransaction: DatabaseTransaction = {
    ...mockConnection,
    async commit(): Promise<void> {},
    async rollback(): Promise<void> {},
  }

  return {
    queries,

    /**
     * Sets the result returned by ALL subsequent queries on this mock — it is
     * **persistent**, not a one-shot response (unlike vitest's
     * `mockResolvedValueOnce`, which this name superficially resembles). Every
     * `query()` call across the pool, `connect()`-ed connections, and
     * `transaction()`-ed transactions keeps returning this same result until
     * you call `setQueryResult` again or `reset()`. To vary the result per
     * query within one test (e.g. an INSERT followed by a SELECT that must
     * see different rows), use {@link createMockDatabase}'s
     * `setQueryResultOnce` instead — queued once-results are consumed first,
     * in FIFO order, one per query, before falling back to this persistent
     * default.
     * @param result - The result every subsequent query returns until changed.
     */
    setQueryResult<T>(result: QueryResult<T>): void {
      nextResult = result
    },

    /**
     * Queues a one-shot query result: the next `query()` call (on the pool, a
     * connected `DatabaseConnection`, or a `DatabaseTransaction`) consumes and
     * removes it, then subsequent queries fall back to the persistent
     * `setQueryResult` value (or the empty-result default). Call it multiple
     * times to queue several results in order — useful for a handler test
     * that issues distinct queries (e.g. an existence check, then an insert)
     * and needs each to see a different result.
     * @param result - The result the next single query call returns.
     */
    setQueryResultOnce<T>(result: QueryResult<T>): void {
      onceQueue.push(result)
    },

    reset(): void {
      queries.length = 0
      nextResult = { rows: [], rowCount: 0 }
      onceQueue.length = 0
    },

    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      queries.push({ text, values })
      return nextQueryResult<T>()
    },

    async connect(): Promise<DatabaseConnection> {
      return mockConnection
    },

    async transaction(): Promise<DatabaseTransaction> {
      return mockTransaction
    },

    async end(): Promise<void> {},

    stats(): { total: number; idle: number; waiting: number } {
      return { total: 1, idle: 1, waiting: 0 }
    },
  }
}

/**
 * Pre-configured mock database for quick setup. Shared module-level instance —
 * call `reset()` in `beforeEach` so recorded queries don't bleed between tests.
 */
export const mockDatabase = createMockDatabase()
