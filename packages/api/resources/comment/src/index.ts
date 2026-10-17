/**
 * Threaded comments resource for molecule.dev.
 *
 * Polymorphic comments that attach to any resource type. Supports threaded
 * replies, pagination, and ownership-based authorization.
 *
 * **Tables this package owns: `comments` and `comment_numbers`.** A comment row is found by its
 * `comments.id` (a UUID); `comment_numbers` gives it the sequential integer many clients address it
 * by, and the join between the two is `comment_numbers.commentId` = `comments.id` (declared FK,
 * `ON DELETE CASCADE`) — one row per numbered comment, never a mapping table of your own.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-comment'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /:resourceType/:resourceId/comments
 * // GET    /:resourceType/:resourceId/comments
 * // GET    /comments/:commentId
 * // PUT    /comments/:commentId
 * // DELETE /comments/:commentId
 * // GET    /comments/:commentId/replies
 * // GET    /:resourceType/:resourceId/comments/count — cheap badge counts
 * ```
 *
 * @remarks
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
 * - **A scaffold that lists this package already has these tables** — its `__setup__` SQL is
 *   copied into the app at create time and replayed on every boot, so do not copy it into
 *   `api/migrations/` yourself; only a package added after the scaffold needs that.
 *   `src/__setup__/comments.sql` ships with this package and must exist in the target
 *   database before use (scaffolded apps apply it automatically; existing apps must apply it
 *   first).
 * - **Integer comment ids (RealWorld's `comment.id`, most public API specs):** keep the
 *   UUID and give each comment a sequential number — `createNumberedComment()` creates both
 *   in one transaction, `getCommentByNumber(n)` finds it, `commentNumbers(ids)` maps a list.
 *   Apply `src/__setup__/comment_numbers.sql` too. Never build your own id-mapping table.
 * - **Reads are PUBLIC by default.** `list`, `read`, `replies`, and `count` ship
 *   with no auth middleware (comment threads on public content). If the
 *   commented resources are private in your app, add an authorizer that checks
 *   access to the PARENT resource before serving its comments.
 * - **The author is always the session user.** Create/update/delete require
 *   `authenticate`; the create handler ignores any client-supplied author id,
 *   and update/delete verify ownership in the handler — keep those properties
 *   in any custom path.
 * - **The parent is polymorphic and unverified** (no FK on
 *   `resourceType`/`resourceId`): validate that the target exists in your domain
 *   code if orphaned threads matter, and reuse the same canonical type slugs as
 *   your other polymorphic resources (bookmarks, activity feed).
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Posting a comment on a commentable resource shows it in the thread
 *   immediately and it persists across a full reload.
 * - [ ] Replying to a comment renders the reply nested under its parent.
 * - [ ] The author can edit their own comment and the updated text persists;
 *   a DIFFERENT signed-in user gets no edit/delete controls on it and a
 *   direct attempt is denied.
 * - [ ] Deleting an own comment removes it per the app's policy (gone or
 *   tombstone) and stays removed after reload.
 * - [ ] A long thread paginates ("load more" fetches older comments) without
 *   duplicating or dropping entries.
 * - [ ] A resource with no comments shows a readable empty state.
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './numbers.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
