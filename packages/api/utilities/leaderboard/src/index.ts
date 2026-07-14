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
 * @module
 */

export * from './browser-guard.js'
export * from './engine.js'
export * from './service.js'
export * from './types.js'
export * from './window.js'
