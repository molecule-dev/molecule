/**
 * Threaded comments resource for molecule.dev.
 *
 * Polymorphic comments that attach to any resource type. Supports threaded
 * replies, pagination, and ownership-based authorization.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   createComment,
 *   getCommentsByResource,
 *   getReplies,
 * } from '@molecule/api-resource-comment'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL). `mlcl inject`
 * // mounts `routes` onto `requestHandlerMap` (/:resourceType/:resourceId/comments, /comments/:id…).
 * setStore(store)
 *
 * // Server-side: the author is the SESSION user (res.locals.session.userId), never the body.
 * const userId = 'user-123'
 * const top = await createComment('post', 'post-42', userId, { body: 'Great write-up!' })
 * const reply = await createComment('post', 'post-42', userId, { body: 'Agreed', parentId: top.id })
 *
 * const thread = await getCommentsByResource('post', 'post-42', { limit: 20 }) // top-level only
 * const replies = await getReplies(top.id) // { data: [reply], total, limit, offset }
 * console.log(thread.data.length, replies.data[0]?.id === reply.id)
 * ```
 *
 * @remarks
 * - **Bond the DataStore before any call.** Every service function goes through
 *   `@molecule/api-database`; without `setStore(...)` at startup they throw
 *   "DataStore not configured".
 * - **`getCommentsByResource()` returns TOP-LEVEL comments only** (`parentId` is
 *   null) — load each thread's replies with `getReplies(commentId)`.
 * - **The service functions do NOT validate input.** The HTTP handlers run
 *   `createCommentSchema`/`updateCommentSchema` first; custom server code calling
 *   `createComment()` directly must `safeParse` with the same schema.
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
