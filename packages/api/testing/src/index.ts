/**
 * Testing utilities for molecule.dev API packages.
 *
 * Provides mock implementations and test helpers for all core interfaces.
 *
 * @module
 * @remarks
 * `createMockDatabase().setQueryResult(result)` is **persistent** — every
 * subsequent `query()` call (pool, connection, or transaction) returns that
 * same result until you call `setQueryResult` again or `reset()`. Despite the
 * name's resemblance to vitest's `mockResolvedValueOnce`, it is NOT a
 * one-shot queue. A handler test that issues multiple distinct queries and
 * needs each to see a different result must use `setQueryResultOnce(result)`
 * instead — queued once-results are consumed first, in FIFO order, one per
 * query, before queries fall back to the persistent `setQueryResult` value
 * (or the empty `{ rows: [], rowCount: 0 }` default).
 */

export * from './browser-guard.js'
export * from './fixtures/index.js'
export * from './helpers/index.js'
export * from './mocks/index.js'
