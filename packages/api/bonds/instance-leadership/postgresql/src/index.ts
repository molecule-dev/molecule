/**
 * PostgreSQL provider for `@molecule/api-instance-leadership`: elect ONE API
 * instance to run platform-wide singleton work, using a PostgreSQL SESSION
 * advisory lock held on a dedicated connection.
 *
 * ```typescript
 * import { acquireLeadership, setProvider } from '@molecule/api-instance-leadership'
 * import { provider } from '@molecule/api-instance-leadership-postgresql'
 *
 * setProvider(provider) // reads DATABASE_URL lazily; nothing connects here
 * acquireLeadership({
 *   onAcquired: () => startPoolManager(),
 *   onLost: () => stopPoolManager(),
 * })
 * ```
 *
 * Use this bond whenever the API runs as more than one process or Machine: a
 * host-local lock (a loopback port, a file) elects one leader PER HOST, so
 * every singleton — pool managers, hibernation, retention sweeps, status
 * recorders — runs once per Machine instead of once per platform.
 *
 * @remarks
 * - **A session lock dies with its connection.** The holder's process exiting,
 *   crashing, or losing the network ends the backend session and PostgreSQL
 *   releases the lock — no TTL to tune, no lock row left stale.
 * - **A leader that loses its connection demotes itself.** The provider stops
 *   treating itself as leader and calls `onLost`; a follower retries every
 *   `retryMs` (default 2 s) and takes over within seconds.
 * - **`prepareThreshold`/pooling caveat.** The lock MUST be taken on a direct
 *   client connection, never through a transaction-mode pooler (PgBouncer in
 *   transaction mode), which multiplexes statements from many clients onto a
 *   session: a lock "held" there is held by an unrelated session. Use a
 *   session-mode pooler or a direct connection.
 * - **Pick a lock id nobody else uses.** Advisory locks share one namespace per
 *   database. The exported `provider` uses `8675310`; a second application
 *   sharing the same database must pass its own id to
 *   `createPostgresLockFactory`.
 * - **This bond runs no singleton work itself.** It only tells the application
 *   which instance leads; the loops belong to the app (`onAcquired`/`onLost`).
 *
 * @module
 */

export * from './lock.js'
export * from './provider.js'
