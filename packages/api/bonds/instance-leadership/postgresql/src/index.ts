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
 * - **Silent holders expire on the database.** PostgreSQL 14+ is required.
 *   The dedicated session has a 15-second `idle_session_timeout`; a leader
 *   sends a bounded heartbeat every five seconds. A frozen VM or half-open
 *   connection therefore cannot retain leadership for hours. Heartbeat failure
 *   demotes the holder and closes its connection. Singleton work must stop
 *   promptly in `onLost` and remain safe to retry after an interruption.
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

export * from './browser-guard.js'
export * from './lock.js'
export * from './provider.js'
