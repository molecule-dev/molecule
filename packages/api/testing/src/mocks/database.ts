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
  reset: () => void
} => {
  const queries: Array<{ text: string; values?: unknown[] }> = []
  let nextResult: QueryResult<unknown> = { rows: [], rowCount: 0 }

  const mockConnection: DatabaseConnection = {
    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      queries.push({ text, values })
      return nextResult as QueryResult<T>
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

    setQueryResult<T>(result: QueryResult<T>): void {
      nextResult = result
    },

    reset(): void {
      queries.length = 0
      nextResult = { rows: [], rowCount: 0 }
    },

    async query<T = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<QueryResult<T>> {
      queries.push({ text, values })
      return nextResult as QueryResult<T>
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
 * Pre-configured mock database for quick setup.
 */
export const mockDatabase = createMockDatabase()
