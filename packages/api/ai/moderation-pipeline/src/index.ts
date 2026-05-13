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
 * @module
 */

export * from './pipeline.js'
export * from './types.js'
