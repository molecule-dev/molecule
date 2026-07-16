/**
 * `@molecule/api-ai-moderation-pipeline` — content moderation built on
 * the bonded AI provider. Classify → policy-match → action → audit-log.
 *
 * Extracted from ai-content-moderator flagship.
 *
 * @example
 * ```ts
 * import { moderate, DEFAULT_POLICY } from '@molecule/api-ai-moderation-pipeline'
 *
 * const decision = await moderate({
 *   content: userComment,
 *   ownerId: userId,
 *   resource: { type: 'comment', id: commentId },
 * })
 * if (decision.action === 'block') return res.status(403).end()
 * if (decision.action === 'flag') void notifyMods(decision)
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/moderation_audit_log.sql` creates
 * `moderation_audit_log`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once. Audit writes are
 * best-effort BY DESIGN (a DB failure never blocks the moderation decision) —
 * so with the table missing, decisions still return but no audit rows are
 * ever written, silently.
 *
 * Requires a bonded `ai` chat provider (`@molecule/api-ai`) — `classify()` /
 * `moderate()` throw if none is bonded.
 *
 * FAILS OPEN on classifier failure: malformed model output (and provider API
 * errors, which arrive as in-band `error` events) resolve to empty `scores`
 * with `reasoning: 'classifier returned malformed JSON'`, and `applyPolicy()`
 * then returns the policy's `defaultAction` (`'allow'` in `DEFAULT_POLICY`)
 * with `flagged: false`. If your app must fail closed, treat empty `scores`
 * (or that reasoning string) as a manual-review case instead of an allow.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pipeline.js'
export * from './types.js'
