/**
 * `@molecule/api-resource-forum-thread` — forum threads + nested replies +
 * voting + author/moderator authorization.
 *
 * Extracted from the forum flagship. `createForumThreadRouter({ isModeratorFor })`
 * exposes public reads + authed writes. Voting is idempotent (changing vote
 * adjusts score correctly; voting again with same value is a noop).
 *
 * @example
 * ```ts
 * import { createForumThreadRouter } from '@molecule/api-resource-forum-thread'
 *
 * app.use('/threads', createForumThreadRouter({
 *   isModeratorFor: async (userId) => userIsMod(userId),
 * }))
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
