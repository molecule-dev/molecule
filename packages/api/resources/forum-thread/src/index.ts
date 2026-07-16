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
 * @remarks
 * Tables: `src/__setup__/forum_threads.sql` creates `forum_threads`,
 * `forum_replies`, and `forum_votes`. An mlcl-scaffolded API replays
 * `__setup__/*.sql` automatically on migrate; anywhere else run it once —
 * nothing at runtime creates them.
 *
 * Reads (`GET /`, `GET /:id`, `GET /:id/replies`) are PUBLIC. Writes read the
 * AUTHENTICATED user from `res.locals.session` (mount the router behind your
 * global auth middleware; without a session every write 401s) — the author is
 * always the session user, never a body field. Edits/deletes are author-only;
 * `isModeratorFor(userId)` is the ONLY escalation path and defaults to
 * `() => false`, so moderator powers are DENIED until you pass a real
 * implementation.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
