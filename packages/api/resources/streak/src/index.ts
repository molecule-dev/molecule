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
 */

export * from './authorizers/index.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
