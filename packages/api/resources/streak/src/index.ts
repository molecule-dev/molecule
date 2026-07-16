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
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
