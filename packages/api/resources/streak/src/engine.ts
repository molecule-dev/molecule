/**
 * Pure streak engine.
 *
 * Stateless — given a prior `StreakState`, a `StreakConfig`, and the
 * timestamp of a new activity event, computes the next state. Has no
 * external dependencies and is fully unit-testable without a database.
 *
 * @module
 */

import type { StreakConfig, StreakState, StreakUpdateInput, StreakUpdateResult } from './types.js'

const HOUR_MS = 60 * 60 * 1000
const DEFAULT_RESET_HOURS = 24

/**
 * Resolves the effective reset window for a config.
 *
 * @param config - Streak config.
 * @returns Reset window in milliseconds.
 */
function resetWindowMs(config: StreakConfig): number {
  return (config.reset_after_hours ?? DEFAULT_RESET_HOURS) * HOUR_MS
}

/**
 * Returns `true` when the new event is within the same calendar day
 * boundary as the previous one (using the reset window as the boundary
 * heuristic — same-day means "less than one window apart and on the
 * same day key based on `reset_after_hours`").
 *
 * For the default 24h window, this collapses to "any two events within
 * 24h of each other count as the same period."
 *
 * @param prev - Previous activity timestamp.
 * @param next - New activity timestamp.
 * @param config - Streak config.
 * @returns `true` if the events fall in the same period.
 */
function isSamePeriod(prev: Date, next: Date, config: StreakConfig): boolean {
  const window = resetWindowMs(config)
  return next.getTime() - prev.getTime() < window
}

/**
 * Returns `true` when the new event lands in the period immediately
 * after the previous one — i.e. continues the streak.
 *
 * @param prev - Previous activity timestamp.
 * @param next - New activity timestamp.
 * @param config - Streak config.
 * @returns `true` if `next` continues the streak from `prev`.
 */
function isContinuation(prev: Date, next: Date, config: StreakConfig): boolean {
  const window = resetWindowMs(config)
  const delta = next.getTime() - prev.getTime()
  return delta >= window && delta < window * 2
}

/**
 * Builds an initial `StreakState` for a brand-new (user, activity_kind).
 *
 * @param userId - The user ID.
 * @param activityKind - The activity kind.
 * @param when - Timestamp of the first event.
 * @returns The initial streak state with `current_streak = longest_streak = 1`.
 */
export function initialState(userId: string, activityKind: string, when: Date): StreakState {
  return {
    user_id: userId,
    activity_kind: activityKind,
    current_streak: 1,
    longest_streak: 1,
    last_activity_date: when,
    freezes_used: 0,
  }
}

/**
 * Pure streak transition — computes the next state for a (previous,
 * config, when) tuple without touching any I/O.
 *
 * Rules:
 *  - No previous state → `current_streak = 1`.
 *  - Same period as previous → no change to streak (idempotent).
 *  - Continuation period → `current_streak + 1`.
 *  - Gap, but a freeze is available → consume freeze, treat as
 *    continuation.
 *  - Gap, no freeze available → reset to `1`.
 *
 * @param input - Prior state, config, and event timestamp.
 * @returns Next state plus reset/freeze flags.
 */
export function computeStreakUpdate(input: StreakUpdateInput): StreakUpdateResult {
  const { previous, config, when } = input

  if (!previous || previous.last_activity_date === null) {
    return {
      state: initialState(previous?.user_id ?? '', config.activity_kind, when),
      freezeConsumed: false,
      reset: false,
    }
  }

  const prev = previous.last_activity_date

  if (when.getTime() < prev.getTime()) {
    // Out-of-order event — keep previous state, only update timestamp
    // forward when newer. Here `when` is older so we no-op on the
    // streak counters.
    return {
      state: { ...previous },
      freezeConsumed: false,
      reset: false,
    }
  }

  if (isSamePeriod(prev, when, config)) {
    return {
      state: { ...previous, last_activity_date: when },
      freezeConsumed: false,
      reset: false,
    }
  }

  if (isContinuation(prev, when, config)) {
    const nextCurrent = previous.current_streak + 1
    return {
      state: {
        ...previous,
        current_streak: nextCurrent,
        longest_streak: Math.max(previous.longest_streak, nextCurrent),
        last_activity_date: when,
      },
      freezeConsumed: false,
      reset: false,
    }
  }

  // Gap exceeded one full continuation window.
  const cap = config.freezes_per_period ?? 0
  if (cap > 0 && previous.freezes_used < cap) {
    const nextCurrent = previous.current_streak + 1
    return {
      state: {
        ...previous,
        current_streak: nextCurrent,
        longest_streak: Math.max(previous.longest_streak, nextCurrent),
        last_activity_date: when,
        freezes_used: previous.freezes_used + 1,
      },
      freezeConsumed: true,
      reset: false,
    }
  }

  return {
    state: {
      ...previous,
      current_streak: 1,
      last_activity_date: when,
      freezes_used: 0,
    },
    freezeConsumed: false,
    reset: true,
  }
}

/**
 * Pure freeze-consumption — explicitly burns one freeze without
 * recording a new activity. Useful when an app exposes a manual
 * "use freeze" action.
 *
 * @param previous - Previous state.
 * @param config - Streak config.
 * @returns Next state plus a `freezeConsumed` flag (`false` if cap reached).
 */
export function consumeFreezeUpdate(
  previous: StreakState,
  config: StreakConfig,
): StreakUpdateResult {
  const cap = config.freezes_per_period ?? 0
  if (cap <= 0 || previous.freezes_used >= cap) {
    return {
      state: { ...previous },
      freezeConsumed: false,
      reset: false,
    }
  }
  return {
    state: { ...previous, freezes_used: previous.freezes_used + 1 },
    freezeConsumed: true,
    reset: false,
  }
}

/**
 * Pure audit — returns `true` when a stale streak (no activity within
 * the reset window) should be reset by a cron sweeper.
 *
 * @param state - Current state.
 * @param config - Streak config.
 * @param now - Current timestamp (defaults to `new Date()`).
 * @returns `true` if the streak is stale and should be reset.
 */
export function isStale(state: StreakState, config: StreakConfig, now: Date = new Date()): boolean {
  if (state.last_activity_date === null) return false
  const delta = now.getTime() - state.last_activity_date.getTime()
  return delta >= resetWindowMs(config) * 2
}
