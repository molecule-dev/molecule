/**
 * Generic streak engine for molecule.dev.
 *
 * Per-user, per-activity streak tracking with configurable reset
 * windows, optional tier-gated "freezes" that absorb a single missed
 * period, and a cron-friendly audit helper. The pure engine
 * ({@link computeStreakUpdate}) is fully testable without a database;
 * the {@link recordActivity}, {@link consumeFreeze}, {@link getStreak},
 * and {@link auditStreak} service helpers persist via the abstract
 * `@molecule/api-database` DataStore.
 *
 * @module
 * @example
 * ```typescript
 * import { recordActivity } from '@molecule/api-streak'
 *
 * const result = await recordActivity('user-1', {
 *   activity_kind: 'lesson',
 *   reset_after_hours: 24,
 *   freezes_per_period: 1,
 * })
 * console.log(result.state.current_streak)
 * ```
 *
 * @remarks
 * Session-auth prerequisite: all routes require an authenticated session
 * (`authenticate`) — handlers derive the user from `res.locals.session.userId`
 * (401 fail-closed) and NEVER from the body or path, so streaks are always
 * scoped to the caller.
 *
 * The stock HTTP handlers accept the streak config (`reset_after_hours`,
 * `freezes_per_period`, `when`) from the REQUEST BODY — a client can inflate
 * its own streak. That only affects the caller's own data, but if streaks are
 * tier-gated, competitive (leaderboards), or reward-bearing, do not mount the
 * stock `record`/`freeze` routes as-is: call `recordActivity`/`consumeFreeze`
 * from your own handler with server-fixed config (derive `freezes_per_period`
 * from the user's plan). `computeStreakUpdate` is a pure function — test
 * streak logic without a database.
 *
 * Tables: `src/__setup__/streaks.sql` creates `streaks` (unique per
 * `(user_id, activity_kind)`). An mlcl-scaffolded API replays
 * `__setup__/*.sql` automatically on migrate; anywhere else run it once —
 * nothing at runtime creates them.
 *
 * @e2e
 * Streak-math checklist — drive the real streak endpoints/UI (live preview,
 * no mocks), adapt each item to this app's actual activity kinds + screens,
 * and check every box off one by one. A box you can't check is a streak-math
 * bug to fix — not a skip. To exercise multi-day behavior without waiting real
 * days, pass an explicit `when` ISO timestamp in the `record` body (the built-in
 * lever, not a mock) and read `current_streak`/`longest_streak` back via `read`:
 * - [ ] Consecutive periods INCREMENT by exactly one: a first-ever record starts
 *   `current_streak` at 1; each later activity 24-48h after the last (one
 *   `reset_after_hours` window, default 24h) bumps it 1 -> 2 -> 3. `current_streak`
 *   equals the count of unbroken consecutive periods ending at the last activity.
 * - [ ] Same period counts ONCE, not twice: a second activity < one window
 *   (< 24h) after the last leaves `current_streak` unchanged (only
 *   `last_activity_date` advances). The boundary is a ROLLING `reset_after_hours`
 *   delta measured off `last_activity_date` in absolute epoch time (UTC millis via
 *   `Date.getTime()`) — NOT a calendar day and NOT the user's timezone. So 23:00
 *   and 01:00-next-day (2h apart) fall in the SAME period though the calendar date
 *   changed, and DST / the user's tz never shift the boundary — verify an activity
 *   just before vs just after local midnight lands in the right period by delta.
 * - [ ] Missing a period RESETS: a gap of >= 2x the window (>= 48h, no freeze)
 *   resets `current_streak` to 1 on the next activity (or to 0 via the
 *   `auditStreak` cron sweep before any new activity), while `longest_streak` is
 *   RETAINED at its high-water mark. Rebuilding past the old peak raises
 *   `longest_streak`; a shorter new run leaves it unchanged.
 * - [ ] A freeze absorbs ONE missed period (only when `freezes_per_period` > 0):
 *   with a freeze available, a single missed period (gap ~2x window) still
 *   increments `current_streak`, sets `freezeConsumed: true`, and bumps
 *   `freezes_used` instead of resetting; a further gap with no freeze left resets.
 * - [ ] AUTHORIZATION — streaks are per-user and server-derived: the row is keyed
 *   by `(user_id, activity_kind)` where `user_id` comes ONLY from
 *   `res.locals.session.userId` (401 fail-closed), never the body or `:activityKind`
 *   path, so no caller can read or grow another user's streak. `current_streak` /
 *   `longest_streak` are computed from real recorded activity, never client-set —
 *   but the stock `record` route DOES accept `reset_after_hours` /
 *   `freezes_per_period` from the body, letting a client inflate its OWN streak;
 *   for competitive or reward-bearing streaks confirm the app fixes that config
 *   server-side.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
