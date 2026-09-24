/**
 * `@molecule/api-ai-moderation-pipeline` — content moderation built on
 * the bonded AI provider. Classify → policy-match → action → audit-log.
 *
 * Extracted from ai-content-moderator flagship.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-ai'
 * import { createProvider } from '@molecule/api-ai-anthropic'
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { DEFAULT_POLICY, moderate } from '@molecule/api-ai-moderation-pipeline'
 *
 * // Startup (server only): the AI classifier and the DataStore for the audit log.
 * setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
 * setStore(store) // reads DATABASE_URL; run __setup__/moderation_audit_log.sql once
 *
 * // In the handler that accepts a new comment:
 * const comment = { id: 'c-42', authorId: 'user-123', body: 'Buy cheap pills at spam.example!!!' }
 * const decision = await moderate({
 *   content: comment.body,
 *   ownerId: comment.authorId,
 *   resource: { type: 'comment', id: comment.id },
 *   policy: { ...DEFAULT_POLICY, action: 'block' }, // block (not just flag) over-threshold content
 * })
 * if (decision.action === 'block') console.log('Rejected:', decision.matched_category) // 'spam'
 * else if (decision.action === 'flag') console.log('Held for review') // also the default on classifier failure
 * else console.log('Published')
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/moderation_audit_log.sql` creates
 * `moderation_audit_log`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once. Audit writes are
 * best-effort (a DB failure never blocks the moderation decision) but are NO
 * LONGER silent: a failed write is logged via `logger.warn({ error })`, so a
 * missing table surfaces in logs instead of vanishing.
 * The audit row is written through `@molecule/api-database`'s DataStore — call
 * `setStore(...)` at startup; with no store bonded every audit write fails
 * (logged as a warning) while decisions still return. Pass `audit: false` to
 * skip the audit entirely.
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
