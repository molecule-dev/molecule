/**
 * Streak persistence service.
 *
 * Combines the pure {@link computeStreakUpdate} engine with abstract
 * `DataStore` calls (no raw SQL) to read and write streak state from
 * the bound database provider.
 *
 * @module
 */

import { create as dbCreate, findOne, updateById } from '@molecule/api-database'

import { computeStreakUpdate, consumeFreezeUpdate, initialState, isStale } from './engine.js'
import type { StreakConfig, StreakState, StreakUpdateResult } from './types.js'

const TABLE = 'streaks'

/**
 * Database row shape (matches `__setup__/streaks.sql`).
 *
 * `last_activity_date` is `string | null` here because most database
 * providers serialise timestamps as ISO strings.
 */
interface StreakRow {
  id: string
  user_id: string
  activity_kind: string
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  freezes_used: number
  createdAt: string
  updatedAt: string
}

/**
 * Converts a stored row to the public `StreakState` shape.
 *
 * @param row - Stored row.
 * @returns Public state.
 */
function rowToState(row: StreakRow): StreakState {
  return {
    user_id: row.user_id,
    activity_kind: row.activity_kind,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    last_activity_date: row.last_activity_date ? new Date(row.last_activity_date) : null,
    freezes_used: row.freezes_used,
  }
}

/**
 * Loads the persisted streak row for a (user, activity_kind) pair, or
 * `null` when none exists.
 *
 * @param userId - The user ID.
 * @param activityKind - The activity kind.
 * @returns The stored row, or `null`.
 */
async function findRow(userId: string, activityKind: string): Promise<StreakRow | null> {
  return findOne<StreakRow>(TABLE, [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'activity_kind', operator: '=', value: activityKind },
  ])
}

/**
 * Records an activity event and returns the updated streak state.
 *
 * Idempotent within a single period: same-period events are absorbed
 * without bumping the counter. Out-of-window gaps reset the streak
 * (or consume a freeze when configured).
 *
 * @param userId - The user ID.
 * @param config - Streak configuration for this activity kind.
 * @param when - Event timestamp (defaults to `new Date()`).
 * @returns The updated state plus reset/freeze flags.
 */
export async function recordActivity(
  userId: string,
  config: StreakConfig,
  when: Date = new Date(),
): Promise<StreakUpdateResult> {
  const row = await findRow(userId, config.activity_kind)
  const previous = row ? rowToState(row) : null

  const result = computeStreakUpdate({
    previous: previous ?? {
      ...initialState(userId, config.activity_kind, when),
      current_streak: 0,
    },
    config,
    when,
  })

  // initialState bumps to 1 already when there's no previous row.
  const next: StreakState = previous
    ? result.state
    : initialState(userId, config.activity_kind, when)

  if (!row) {
    await dbCreate(TABLE, {
      user_id: next.user_id,
      activity_kind: next.activity_kind,
      current_streak: next.current_streak,
      longest_streak: next.longest_streak,
      last_activity_date: next.last_activity_date,
      freezes_used: next.freezes_used,
    })
  } else {
    await updateById(TABLE, row.id, {
      current_streak: next.current_streak,
      longest_streak: next.longest_streak,
      last_activity_date: next.last_activity_date,
      freezes_used: next.freezes_used,
    })
  }

  return { ...result, state: next }
}

/**
 * Manually consumes one freeze for the user's current streak, if
 * available under the configured cap.
 *
 * @param userId - The user ID.
 * @param config - Streak configuration for this activity kind.
 * @returns The updated state plus a `freezeConsumed` flag.
 */
export async function consumeFreeze(
  userId: string,
  config: StreakConfig,
): Promise<StreakUpdateResult> {
  const row = await findRow(userId, config.activity_kind)
  if (!row) {
    return {
      state: {
        user_id: userId,
        activity_kind: config.activity_kind,
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null,
        freezes_used: 0,
      },
      freezeConsumed: false,
      reset: false,
    }
  }

  const previous = rowToState(row)
  const result = consumeFreezeUpdate(previous, config)
  if (result.freezeConsumed) {
    await updateById(TABLE, row.id, { freezes_used: result.state.freezes_used })
  }
  return result
}

/**
 * Reads the current streak state for a (user, activity_kind) pair.
 *
 * @param userId - The user ID.
 * @param activityKind - The activity kind.
 * @returns The current state, or a zeroed state when no row exists.
 */
export async function getStreak(userId: string, activityKind: string): Promise<StreakState> {
  const row = await findRow(userId, activityKind)
  if (row) return rowToState(row)
  return {
    user_id: userId,
    activity_kind: activityKind,
    current_streak: 0,
    longest_streak: 0,
    last_activity_date: null,
    freezes_used: 0,
  }
}

/**
 * Audits a single streak and resets it when the last activity is
 * outside the configured reset window. Intended for cron sweepers.
 *
 * @param userId - The user ID.
 * @param config - Streak configuration for this activity kind.
 * @param now - Audit timestamp (defaults to `new Date()`).
 * @returns `true` when the streak was reset, `false` otherwise.
 */
export async function auditStreak(
  userId: string,
  config: StreakConfig,
  now: Date = new Date(),
): Promise<boolean> {
  const row = await findRow(userId, config.activity_kind)
  if (!row) return false
  const state = rowToState(row)
  if (!isStale(state, config, now)) return false
  await updateById(TABLE, row.id, { current_streak: 0, freezes_used: 0 })
  return true
}
