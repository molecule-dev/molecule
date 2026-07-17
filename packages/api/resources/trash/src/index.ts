/**
 * Polymorphic soft-delete + restore + purge helper for any molecule resource.
 *
 * Captures a snapshot of any resource at trash time, then either restores
 * it (re-creating the parent via a registered callback) or purges it. The
 * same package serves note-taking, document-collaboration, kanban,
 * project-management, wiki, and any other productivity app that needs an
 * undo-friendly delete experience.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   trashItem,
 *   restoreFromTrash,
 *   registerRestoreCallback,
 *   routes,
 *   requestHandlerMap,
 * } from '@molecule/api-trash'
 *
 * // 1. Soft-delete from a parent resource's `delete` handler:
 * await trashItem({
 *   resourceType: 'document',
 *   resourceId: doc.id,
 *   userId: (res.locals.session as { userId?: string } | undefined)?.userId,
 *   snapshot: doc,
 *   reason: 'user delete',
 *   ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
 * })
 *
 * // 2. Register a restore callback at startup so the HTTP `restore`
 * //    route can re-create the parent resource:
 * registerRestoreCallback('document', async (snapshot) => {
 *   await documentService.upsertFromSnapshot(snapshot)
 * })
 *
 * // 3. Wire routes via mlcl inject — surfaces:
 * //   POST   /:resourceType/:resourceId/trash
 * //   GET    /trash
 * //   GET    /trash/count
 * //   GET    /trash/:trashId
 * //   POST   /trash/:trashId/restore
 * //   POST   /trash/:trashId/purge
 * ```
 *
 * @remarks
 * Session-auth prerequisite + owner-scoping: every route requires an
 * authenticated session and is owner-scoped IN-HANDLER — the caller is
 * re-derived from `res.locals.session.userId` (any client-supplied `userId`
 * is ignored), `list`/`count`/`read` return only the caller's rows, and
 * `restore`/`purge` act only on rows the caller owns. Legitimate cross-user
 * access (an admin trash console) is opt-in by composing the `trashAdmin`
 * middleware onto a route; without it there is no open endpoint. In your own
 * code, always take the user from the session (e.g. `getUserId(res)`), never
 * `req.body`.
 *
 * The HTTP `restore` route is fail-closed on the callback registry: until
 * `registerRestoreCallback(resourceType, cb)` runs at startup, restoring that
 * resource type returns 501 — register a callback for EVERY resource type you
 * trash. (Programmatic callers can pass the callback directly to
 * `restoreFromTrash()`.) A row that was already restored or purged returns
 * 409. Handler errors flow through `t()` with English defaults; install
 * `@molecule/api-locales-trash` for translations.
 *
 * Tables: `src/__setup__/trashedItems.sql` creates `trashedItems`. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 *
 * @e2e
 * Soft-delete lifecycle checklist — drive the real UI (live preview, no
 * mocks), adapt each item to this app's actual delete / Trash / restore
 * screens, and check every box off one by one. A box you can't check is a
 * bug to fix — not a skip:
 * - [ ] Soft-delete tombstones, it does not vanish: deleting an item in the
 *   UI removes it from the normal/active view (the parent's list, search, and
 *   any counts) yet it appears in the Trash view — the underlying trash row
 *   still exists with `trashedAt` set and `restoredAt`/`purgedAt` null.
 *   Confirm the same item is absent from active AND present in trash.
 * - [ ] Restore returns it verbatim: restoring from the Trash view re-creates
 *   the parent from its snapshot exactly as it was (same fields/content) and
 *   removes it from Trash (`restoredAt`/`restoredBy` get stamped, so the
 *   active-only trash list and count drop it). Restoring a row already
 *   restored or purged is refused (409), never silently duplicated.
 * - [ ] Purge / empty-trash is distinct from soft-delete and irreversible:
 *   permanently deleting a trashed item (or emptying trash) stamps `purgedAt`
 *   / removes the row — it leaves BOTH the active view and the Trash view, and
 *   a later restore is refused (409 already-resolved, or 404 once the row is
 *   hard-removed). Soft-delete stays recoverable; purge does not.
 * - [ ] Retention window (only if the app sets one): items trashed with a
 *   `ttlMs` get an `expiresAt`; once past it they become eligible for
 *   auto-purge (`purgeExpired`) and stop being restorable, matching the stated
 *   policy (e.g. "kept 30 days"). Skip only if the app defines no window.
 * - [ ] No deleted data leaks as active: a soft-deleted item never shows in
 *   normal listings, search results, or counts/badges — only in Trash. Verify
 *   the active count drops by exactly one on delete and the item is unfindable
 *   via search until it is restored.
 * - [ ] Authorization — each user sees and restores/purges only THEIR OWN
 *   trash: signed in as a second user, the Trash view shows none of the first
 *   user's items, and guessing another user's `trashId` into read / restore /
 *   purge returns 404 (existence is not leaked — not 403). The owner is taken
 *   from the session (any client-supplied `userId` is ignored), so a restored
 *   item returns to its original owner, never the caller.
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
