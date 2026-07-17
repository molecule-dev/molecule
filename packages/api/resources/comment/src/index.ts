/**
 * Threaded comments resource for molecule.dev.
 *
 * Polymorphic comments that attach to any resource type. Supports threaded
 * replies, pagination, and ownership-based authorization.
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
 *   bare array — read the rows off `result.data` (server) / `res.data.data` (client, after the
 *   HttpResponse wrapper). Treating the response as a bare array — or `unwrapList`, which only
 *   peels a PURE single-key `{ data }` — yields an EMPTY list.
 * - **Migration required.** `src/__setup__/comments.sql` ships with this package
 *   and must exist in the target database before use (scaffolded apps apply it
 *   automatically; existing apps must apply it first).
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

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
