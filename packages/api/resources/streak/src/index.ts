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
 * Server-authoritative by design: the stock HTTP handlers (`record`/`freeze`)
 * read NO streak levers from the request body. The event timestamp is the
 * server clock and the config (`reset_after_hours`, `freezes_per_period`) is
 * resolved on the server via {@link resolveStreakConfig} — so a client can only
 * signal "I did the activity now", never the resulting `current_streak` /
 * `longest_streak` or the levers that would let it inflate them (a forged
 * `when`, a widened window, or an unbounded freeze cap are all ignored). To
 * grant non-default windows or tier-gated freezes, register a resolver at
 * startup with {@link setStreakConfigResolver} — e.g. derive
 * `freezes_per_period` from the caller's plan; with no resolver the cap is `0`
 * (freezes off) and the window is 24h. The `recordActivity` / `consumeFreeze`
 * service functions still take an explicit config (and `recordActivity` an
 * explicit `when`) for trusted server callers (cron, backfill, your own
 * handler). `computeStreakUpdate` is a pure function — test streak logic
 * without a database.
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
 * bug to fix — not a skip. The stock `record` endpoint timestamps events with
 * the SERVER clock (it deliberately ignores any client `when`), so to exercise
 * multi-day behavior without waiting real days, drive the trusted service —
 * call `recordActivity(userId, config, when)` with an explicit `when` (or unit
 * test the pure `computeStreakUpdate`) — and read `current_streak` /
 * `longest_streak` back via `read`:
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
 *   `longest_streak` are computed from real recorded activity, never client-set:
 *   the stock `record` / `freeze` routes read NO streak levers from the body —
 *   the event time is the server clock and the config (`reset_after_hours`,
 *   `freezes_per_period`) comes from the server-side {@link resolveStreakConfig}
 *   (register via {@link setStreakConfigResolver}; default window 24h, freeze
 *   cap 0). Confirm a body claiming an inflated count/window/freeze-cap is
 *   ignored and the server-computed value wins.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './config-registry.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
