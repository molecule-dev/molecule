/**
 * Testing utilities for molecule.dev API packages.
 *
 * Provides in-memory mock implementations for five core interfaces —
 * database (`DatabasePool`), cache, queue, emails, logger — plus generic
 * async test helpers (`waitFor`, `createDeferred`, `expectThrows`,
 * `createSpy`, `randomString`/`randomEmail`/`randomUUID`) and
 * user/device/session fixture factories (`createUserFixture`,
 * `createDeviceFixture`, `createSessionFixture`, `createMany`).
 *
 * @example
 * ```typescript
 * import { setPool } from '@molecule/api-database'
 * import { setTransport } from '@molecule/api-emails'
 * import {
 *   createMockDatabase,
 *   createMockEmail,
 *   createUserFixture,
 * } from '@molecule/api-testing'
 *
 * // Fresh mocks per test file, wired exactly like a real bond — the code
 * // under test needs zero changes.
 * const db = createMockDatabase()
 * const email = createMockEmail()
 * setPool(db)
 * setTransport(email)
 *
 * // Queue per-query results (FIFO, one per query), then a persistent fallback.
 * db.setQueryResultOnce({ rows: [createUserFixture()], rowCount: 1 })
 * db.setQueryResult({ rows: [], rowCount: 0 })
 *
 * // ...run the code under test, then assert on what it did:
 * console.log(db.queries)          // every { text, values } issued
 * console.log(email.sentMessages)  // every EmailMessage sent
 *
 * email.failNext(new Error('SMTP down')) // next sendMail() rejects once
 * ```
 *
 * @remarks
 * - Wire mocks through each core's OWN setter — `setPool`
 *   (`@molecule/api-database`), `setTransport` (`@molecule/api-emails`),
 *   `setProvider` (`@molecule/api-cache`, `@molecule/api-queue`), `setLogger`
 *   (`@molecule/api-logger`). Mocks exist ONLY for those five cores; for any
 *   other core, mock its bond with your test runner (e.g. `vi.mock`).
 * - `createMockDatabase().setQueryResult(result)` is **persistent** — every
 *   subsequent `query()` call (pool, connection, or transaction) returns that
 *   same result until you call `setQueryResult` again or `reset()`. Despite the
 *   name's resemblance to vitest's `mockResolvedValueOnce`, it is NOT a
 *   one-shot queue. A handler test that issues multiple distinct queries and
 *   needs each to see a different result must use `setQueryResultOnce(result)`
 *   instead — queued once-results are consumed first, in FIFO order, one per
 *   query, before queries fall back to the persistent `setQueryResult` value
 *   (or the empty `{ rows: [], rowCount: 0 }` default).
 * - The prebuilt `mockDatabase` / `mockCache` / `mockQueue` / `mockEmail` /
 *   `mockLogger` constants are shared module-level singletons — recorded
 *   queries, sent messages, and cache entries BLEED between test files that
 *   import them. Call `reset()` in `beforeEach`, or prefer the
 *   `createMockX()` factories for per-file isolation.
 * - Name collisions: `waitFor` also exists as vitest's `vi.waitFor` and in
 *   @testing-library; `createSpy` overlaps `vi.fn`. Import from ONE source
 *   per file so the wrong signature isn't picked up silently.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './fixtures/index.js'
export * from './helpers/index.js'
export * from './mocks/index.js'
