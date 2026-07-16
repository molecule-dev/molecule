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
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual reputation-earning flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip:
 * - [ ] A reputation-earning action (an upvote, an accepted answer, whatever
 *   this app awards for) bumps the actor's total by exactly the points that
 *   action is worth: note the score shown in the UI before, perform the action,
 *   then confirm the new total equals old plus that delta — the arithmetic is
 *   exact, not just "the number went up".
 * - [ ] Levels/tiers track the total at the right thresholds: as the score
 *   crosses a threshold the displayed level advances by one, and a score just
 *   below that threshold does NOT advance. Badges appear only once earned and
 *   stay a single copy — re-earning the same badge never adds a duplicate.
 * - [ ] If this app surfaces a leaderboard or ranking, it orders users by their
 *   real totals — the top user has the highest score, and a change to one user's
 *   total re-sorts the list correctly.
 * - [ ] Anti-gaming — points cannot be farmed: repeating the SAME source action
 *   (double-clicking one upvote, re-firing a single accepted answer) awards the
 *   points once, not per click; a user cannot award themselves (no self-upvote
 *   or self-award inflates their own total); and any daily or per-source cap the
 *   app defines actually stops further points once it is hit.
 * - [ ] Reversing an action deducts what it granted: undo the upvote or delete
 *   the post that earned points and confirm the actor's total drops back by the
 *   same amount — an undo leaves the score honest, never stranded high.
 * - [ ] Reputation is awarded by the server alone: there is NO request a user
 *   can send to set their own score, level, points, or badge directly — no form
 *   field or API parameter feeds the delta. A user sees everyone's public rep but
 *   the only thing that changes it is a real earning action the server scored.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './engine.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
