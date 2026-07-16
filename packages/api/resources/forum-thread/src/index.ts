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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual forum screens/flows, and check every box off
 * one by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a thread persists it: submit a title + body in the composer →
 *   it returns and appears in the forum list (GET /) with your title, and
 *   opening it shows the body and YOU as the author (author is the session
 *   user, never a body field).
 * - [ ] Posting a reply adds it in order and bumps the count: submit a reply →
 *   it appears at the bottom of the thread's replies (chronological), the
 *   thread's reply_count increments by one, and the thread jumps to the top of
 *   the "recent" sort (last_activity_at). A nested reply (parent_reply_id)
 *   renders under its parent.
 * - [ ] A locked thread rejects replies, a pinned thread sorts first: a thread
 *   with status 'locked' (or 'archived') refuses a new reply with the visible
 *   "Thread is closed for replies" message and adds nothing; a pinned thread
 *   (is_pinned) sorts above non-pinned ones under the "pinned" sort.
 * - [ ] Counters are truthful: each open of a thread (GET /:id) increments its
 *   view_count by one, and reply_count always equals the number of replies
 *   shown — no drift.
 * - [ ] Edit/delete is author-only, escalation is moderator-only: only the
 *   AUTHOR can edit or delete their own thread/reply; another user's attempt is
 *   refused and nothing changes. Pinning, status changes (lock/close/archive),
 *   and deleting SOMEONE ELSE'S thread/reply require a moderator
 *   (isModeratorFor → true, which defaults to false) — a normal user invoking
 *   any of those is denied and the action never takes effect.
 * - [ ] Writes require a session and the author isn't spoofable: logged out,
 *   every write (create, reply, edit, delete, vote) is refused (401) and the UI
 *   cannot post; logged in, sending an author_id/user id in the body does NOT
 *   override the real author (the session user). Reads (list/detail/replies)
 *   stay public.
 * - [ ] Deleting cascades correctly: deleting a THREAD also removes its replies
 *   (they vanish from the forum), while deleting a REPLY tombstones it (body
 *   shows "[deleted]") so nested structure is preserved rather than removed.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
