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
 * best-effort (a DB failure never blocks the moderation decision) but are NO
 * LONGER silent: a failed write is logged via `logger.warn({ error })`, so a
 * missing table surfaces in logs instead of vanishing.
 *
 * Requires a bonded `ai` chat provider (`@molecule/api-ai`) — `classify()` /
 * `moderate()` throw if none is bonded (a misconfiguration, surfaced loudly).
 *
 * FAILS SAFE on classifier failure. When the classifier can't produce a signal
 * — a provider error/timeout, an in-band `error` stream event, or malformed
 * model output — `classify()` returns empty `scores` WITH `error` set, and
 * `moderate()` routes per `policy.onError`, ALWAYS logging the failure via
 * `logger.error({ error })`. `onError` defaults to `'flag'` (route to human
 * review — never a silent allow); set `'block'` to fail closed or `'allow'` to
 * explicitly opt into fail-open. The env var `MODERATION_ON_ERROR` overrides
 * the default when a policy omits `onError`. Such decisions carry
 * `errored: true`. Direct `classify()` callers (bypassing `moderate()`) MUST
 * check `result.error` before trusting empty `scores`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './pipeline.js'
export * from './types.js'
