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
 *
 * @remarks
 * - **Migration required.** Three files ship in `src/__setup__/`
 *   (`reputation_events.sql`, `reputation_scores.sql`, `badges.sql`) and must
 *   exist in the target database before use (scaffolded apps apply them
 *   automatically; existing apps must apply them first).
 * - **Mutations are server-internal ONLY — the shipped routes are read-only.**
 *   `recordEvent()`, `awardBadge()`, `revokeBadge()` are service functions meant
 *   to be called from YOUR domain code (an accepted-answer handler, a moderation
 *   hook, a cron job). NEVER expose them on a route that accepts `kind` /
 *   `delta` / `badgeKind` from the client — a client-supplied delta is score
 *   tampering. The server decides the delta for each domain event.
 * - **Reads are PUBLIC by design.** `GET /users/:id/reputation` and
 *   `GET /users/:id/badges` ship with no auth middleware (public-profile data
 *   for social apps). If reputation is private in your app, add an authorizer.
 * - `awardBadge()` is idempotent (re-awarding returns the existing row);
 *   `recordEvent()` is NOT — guard call sites against double-firing, and record
 *   a compensating negative event for undo (the event history is append-only).
 * - `computeLevel(score, thresholds)` is pure and accepts custom thresholds, but
 *   the `level` stored by `recordEvent()` uses the DEFAULT thresholds — recompute
 *   client-side from your own thresholds if you customize them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
