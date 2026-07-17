/**
 * Generic leaderboard engine for molecule.dev.
 *
 * Ranked-aggregate over `(user_id, metric, window)` with built-in
 * `daily` / `weekly` / `monthly` / `all-time` windows, custom
 * `[start, end)` ranges, optional `scopeKey` partitioning (per-cohort,
 * per-classroom, per-friend-group), competition ranking with explicit
 * tie-break strategies, and pagination.
 *
 * The pure engine ({@link computeLeaderboard}) is fully testable
 * without a database. The {@link recordMetric}, {@link getLeaderboard},
 * {@link rollupLeaderboard}, and {@link deleteEvents} service helpers
 * persist via the abstract `@molecule/api-database` DataStore — no raw
 * SQL in handler-callable code. Schema lives in
 * `__setup__/leaderboard_events.sql`.
 *
 * Apps that need cron-style rollups can wire {@link rollupLeaderboard}
 * into a `@molecule/api-cron` job.
 *
 * @example
 * ```typescript
 * import {
 *   recordMetric,
 *   getLeaderboard,
 *   rollupLeaderboard,
 * } from '@molecule/api-leaderboard'
 *
 * await recordMetric('user-1', 'xp', 50)
 * await recordMetric('user-2', 'xp', 70)
 *
 * const top = await getLeaderboard({
 *   metric: 'xp',
 *   window: 'weekly',
 *   limit: 10,
 *   tieBreak: 'earliest',
 * })
 *
 * // Cron rollup (e.g. every hour)
 * await rollupLeaderboard({ metric: 'xp', window: 'weekly' })
 * ```
 *
 * @remarks
 * Table prerequisites: the service helpers read/write `leaderboard_events`
 * and `leaderboard_rollups`. The DDL ships as a .sql file under the package's
 * `__setup__` directory. An mlcl-scaffolded API replays it automatically on
 * migrate; anywhere else run the file once against your database — nothing at
 * runtime creates the tables.
 *
 * The DDL is portable, standard SQL and runs UNCHANGED on PostgreSQL and
 * SQLite — it uses no dialect-only functions: row ids come from the
 * `@molecule/api-database` DataStore's `create()` (which generates a UUID when
 * the caller omits one, so the `id` columns need no DB-side
 * `gen_random_uuid()`), and timestamp defaults use the standard
 * `CURRENT_TIMESTAMP` rather than Postgres's `now()`. The `UUID`/`TIMESTAMPTZ`
 * type names and the partial index are PostgreSQL-native and accepted by
 * SQLite's type affinity; MySQL's stricter parser has them normalised
 * automatically by the `@molecule/api-database-mysql` bond at migrate time
 * (`UUID`→`CHAR(36)`, `TIMESTAMPTZ`→`TIMESTAMP`, the partial-index predicate
 * dropped). So the service is genuinely dialect-agnostic across all three
 * official database bonds — no manual DDL porting required.
 *
 * A `@molecule/api-database` bond must be wired at startup before calling
 * the service helpers; the pure engine (`computeLeaderboard`) needs no
 * database at all.
 *
 * Scope semantics: omitting `scopeKey` in a query targets the GLOBAL board
 * (rows whose `scope_key` is null) — it does not aggregate across scopes.
 * Ranking is competition style: tied scores share a rank, and `tieBreak`
 * (`'none' | 'earliest' | 'user_id'`) controls ordering within a tie.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './engine.js'
export * from './service.js'
export * from './types.js'
export * from './window.js'
