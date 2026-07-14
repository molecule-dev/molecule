/**
 * Generic reputation/karma engine for molecule.dev.
 *
 * Per-user reputation scoring with append-only event history,
 * idempotent badge awards, and a pure {@link computeLevel} helper for
 * deriving levels from configurable thresholds. The service layer
 * persists via the abstract `@molecule/api-database` DataStore — no
 * raw SQL leaks into handler-callable code.
 *
 * Pairs with the frontend display package
 * `@molecule/app-reputation-badge-react`.
 *
 * @module
 * @example
 * ```typescript
 * import { recordEvent, getScore, awardBadge } from '@molecule/api-reputation'
 *
 * await recordEvent('user-1', 'accepted-solution', 15, {
 *   sourceId: 'comment-42',
 * })
 *
 * const score = await getScore('user-1')
 * console.log(score.score, score.level)
 *
 * if (score.score >= 1000) {
 *   await awardBadge('user-1', 'top-contributor')
 * }
 * ```
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
