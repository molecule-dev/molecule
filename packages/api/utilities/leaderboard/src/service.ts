/**
 * Leaderboard persistence service.
 *
 * Combines the pure {@link computeLeaderboard} engine with abstract
 * `DataStore` calls — no raw SQL — to record metric events and serve
 * ranked queries against a bonded database.
 *
 * @module
 */

import {
  create as dbCreate,
  deleteMany,
  findMany,
  type WhereCondition,
} from '@molecule/api-database'

import { computeLeaderboard } from './engine.js'
import type {
  Aggregation,
  LeaderboardEntry,
  LeaderboardEvent,
  LeaderboardOptions,
} from './types.js'
import { resolveWindow } from './window.js'

const EVENTS_TABLE = 'leaderboard_events'
const ROLLUPS_TABLE = 'leaderboard_rollups'

/**
 * Database row shape (matches `__setup__/leaderboard_events.sql`).
 *
 * `occurred_at` is `string` because most database providers serialise
 * timestamps as ISO strings.
 */
interface EventRow {
  id: string
  user_id: string
  metric: string
  value: number
  scope_key: string | null
  occurred_at: string
}

/**
 * Records a single metric event for a user.
 *
 * Idempotency: not enforced. Apps that need de-duplication should pass
 * a stable surrogate metric id and clean up via {@link deleteEvents}
 * before re-recording, or use a dedicated upsert path.
 *
 * @param userId - The user identifier.
 * @param metric - Metric identifier, e.g. `'xp'`, `'lessons-completed'`.
 * @param value - Score contribution. Any finite number.
 * @param when - Event timestamp. Defaults to `new Date()`.
 * @param scopeKey - Optional scope partition for friend / cohort boards.
 * @returns Resolves once the row is persisted.
 */
export async function recordMetric(
  userId: string,
  metric: string,
  value: number,
  when: Date = new Date(),
  scopeKey?: string,
): Promise<void> {
  if (!Number.isFinite(value)) {
    throw new Error(`recordMetric value must be finite, got ${String(value)}`)
  }
  await dbCreate(EVENTS_TABLE, {
    user_id: userId,
    metric,
    value,
    scope_key: scopeKey ?? null,
    occurred_at: when,
  })
}

/**
 * Reads all events relevant to the requested leaderboard, then folds
 * them through the pure engine.
 *
 * For very large boards, prefer {@link rollupLeaderboard} and read
 * pre-computed rollups instead.
 *
 * @param options - Leaderboard query options.
 * @param aggregation - Aggregation strategy. Defaults to `sum`.
 * @returns Ranked + paginated entries.
 */
export async function getLeaderboard(
  options: LeaderboardOptions,
  aggregation: Aggregation = 'sum',
): Promise<LeaderboardEntry[]> {
  const events = await fetchEvents(options)
  return computeLeaderboard({ events, options, aggregation })
}

/**
 * Computes a leaderboard once and persists each ranked entry to the
 * `leaderboard_rollups` table for the supplied window. Useful from a
 * `@molecule/api-cron` hourly/daily job.
 *
 * Existing rollup rows for the exact same `(metric, window_kind,
 * window_start, scope_key)` tuple are deleted first so the rollup
 * reflects the latest aggregate state.
 *
 * @param options - Leaderboard query options. `limit` / `offset` are
 *                  ignored — the full board is rolled up.
 * @param aggregation - Aggregation strategy. Defaults to `sum`.
 * @returns The ranked entries that were written.
 */
export async function rollupLeaderboard(
  options: LeaderboardOptions,
  aggregation: Aggregation = 'sum',
): Promise<LeaderboardEntry[]> {
  const fullBoardOpts: LeaderboardOptions = {
    ...options,
    limit: undefined,
    offset: 0,
  }
  const events = await fetchEvents(fullBoardOpts)
  const ranked = computeLeaderboard({ events, options: fullBoardOpts, aggregation })

  const resolved = resolveWindow(options.window, options.now)
  const windowKind = describeWindow(options.window)
  const windowStart = resolved.start ?? new Date(0)
  const windowEnd = resolved.end ?? new Date(8.64e15)
  const scopeKey = options.scopeKey ?? null

  const rollupWhere: WhereCondition[] = [
    { field: 'metric', operator: '=', value: options.metric },
    { field: 'window_kind', operator: '=', value: windowKind },
    { field: 'window_start', operator: '=', value: windowStart },
    scopeKey === null
      ? { field: 'scope_key', operator: 'is_null' }
      : { field: 'scope_key', operator: '=', value: scopeKey },
  ]
  await deleteMany(ROLLUPS_TABLE, rollupWhere)

  for (const entry of ranked) {
    await dbCreate(ROLLUPS_TABLE, {
      metric: options.metric,
      window_kind: windowKind,
      window_start: windowStart,
      window_end: windowEnd,
      scope_key: scopeKey,
      user_id: entry.user_id,
      score: entry.score,
      rank: entry.rank,
    })
  }

  return ranked
}

/**
 * Bulk delete events for a metric (and optional scope). Useful for
 * tests, GDPR erasure, or pruning historical data.
 *
 * @param metric - Metric identifier.
 * @param scopeKey - Optional scope partition. When omitted, **all**
 *                   events for the metric are deleted regardless of
 *                   scope. When supplied, only matching scope events
 *                   are deleted (use the literal `null`-equivalent by
 *                   passing the empty string only if you persisted
 *                   that explicitly — the column is `null` by default).
 * @returns Resolves once the deletion is dispatched.
 */
export async function deleteEvents(metric: string, scopeKey?: string): Promise<void> {
  const where: WhereCondition[] = [{ field: 'metric', operator: '=', value: metric }]
  if (scopeKey !== undefined) {
    where.push({ field: 'scope_key', operator: '=', value: scopeKey })
  }
  await deleteMany(EVENTS_TABLE, where)
}

/**
 * Fetches the events relevant to a leaderboard query, applying the
 * window + scope filter at the DataStore layer. The result is fed
 * through the pure engine to produce the final ranking.
 *
 * @param options - Leaderboard options.
 * @returns Plain {@link LeaderboardEvent} array.
 */
async function fetchEvents(options: LeaderboardOptions): Promise<LeaderboardEvent[]> {
  const resolved = resolveWindow(options.window, options.now)
  const where: WhereCondition[] = [{ field: 'metric', operator: '=', value: options.metric }]
  if (resolved.start) {
    where.push({ field: 'occurred_at', operator: '>=', value: resolved.start })
  }
  if (resolved.end) {
    where.push({ field: 'occurred_at', operator: '<', value: resolved.end })
  }
  if (options.scopeKey !== undefined) {
    where.push({ field: 'scope_key', operator: '=', value: options.scopeKey })
  } else {
    where.push({ field: 'scope_key', operator: 'is_null' })
  }

  const rows = await findMany<EventRow>(EVENTS_TABLE, { where })
  return rows.map((row) => ({
    user_id: row.user_id,
    value: row.value,
    when: new Date(row.occurred_at),
    scopeKey: row.scope_key ?? undefined,
  }))
}

/**
 * String label used for the `window_kind` rollup column. Custom windows
 * get a `'custom'` label — apps that need fine-grained kinds should
 * encode them in `scope_key`.
 *
 * @param window - The leaderboard window descriptor.
 * @returns Short string identifier (`daily`, `weekly`, `monthly`,
 *          `all-time`, `custom`).
 */
function describeWindow(
  window: LeaderboardOptions['window'],
): 'daily' | 'weekly' | 'monthly' | 'all-time' | 'custom' {
  if (typeof window === 'string') return window
  return 'custom'
}
