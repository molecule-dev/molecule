/**
 * Bookmark/favorite resource for molecule.dev.
 *
 * Allows users to bookmark any resource, organize into folders, and check
 * bookmark status.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-bookmark'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /bookmarks
 * // GET    /bookmarks
 * // GET    /bookmarks/folders
 * // GET    /bookmarks/check/:resourceType/:resourceId
 * // DELETE /bookmarks/:resourceType/:resourceId
 * ```
 *
 * @remarks
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server) / `res.data.data` (client, after the
 *   HttpResponse wrapper). Treating the response as a bare array — or `unwrapList`, which only
 *   peels a PURE single-key `{ data }` — yields an EMPTY list.
 * - **Migration required.** `src/__setup__/bookmarks.sql` ships with this package
 *   and must exist in the target database before use (scaffolded apps apply it
 *   automatically). Note the `UNIQUE ("userId","resourceType","resourceId")`
 *   constraint — one bookmark per user per resource.
 * - **`addBookmark()` is idempotent and does NOT move folders.** Re-adding an
 *   existing bookmark returns the existing row unchanged — to move a bookmark to
 *   another folder, remove and re-add it (or add your own update path).
 * - **Owner-scoped via the session.** All routes require `authenticate` and every
 *   query filters by the session `userId` — never accept a target userId from the
 *   client (IDOR).
 * - Bookmarked resources are polymorphic and unverified (no FK): use the same
 *   canonical `resourceType` slugs as your other polymorphic resources
 *   (comments, activity feed) so `check`/`remove` keys line up.
 * - Folders are free-form strings on the bookmark row (`GET /bookmarks/folders`
 *   returns the distinct set) — there is no folder entity to create first.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Bookmarking an item (POST /bookmarks with its resourceType +
 *   resourceId) saves it, it then appears in the user's bookmarks list
 *   (GET /bookmarks), and its bookmark/star control reflects the saved state
 *   (GET /bookmarks/check/:resourceType/:resourceId returns { bookmarked: true }).
 * - [ ] It is idempotent and toggles cleanly: bookmarking the SAME
 *   resourceType+resourceId twice does NOT create a duplicate (the UNIQUE
 *   (userId, resourceType, resourceId) constraint holds — the second add
 *   returns the existing row), and un-bookmarking
 *   (DELETE /bookmarks/:resourceType/:resourceId) removes it from the list and
 *   flips the control back (check returns { bookmarked: false }).
 * - [ ] Folders work: a bookmark filed into a folder (the free-form `folder`
 *   string, set at create time — re-adding does NOT move it between folders)
 *   shows under that folder, GET /bookmarks/folders returns the distinct folder
 *   set, and GET /bookmarks?folder=X (and ?resourceType=X) filters the list to
 *   only the matching bookmarks.
 * - [ ] Display data resolves from the referenced resource: the bookmark row
 *   stores only resourceType+resourceId (no title/url/thumbnail, no FK), so each
 *   list item renders its real title/thumbnail by looking the target up, and a
 *   bookmark whose target was since deleted is handled gracefully (hidden or
 *   tombstoned, never a crash or a blank row).
 * - [ ] Authorization — bookmarks are strictly per-user: the owner is the
 *   session userId (res.locals.session), NEVER a userId taken from the request
 *   body; every list/check/remove is scoped to that session user, so one user
 *   can neither see nor delete another user's saved items (there is no
 *   bookmark-id route to guess — keys are resourceType+resourceId under the
 *   caller's own userId); and a user can only bookmark targets they are allowed
 *   to see (the target is polymorphic and unverified, so gate the create by
 *   target visibility).
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
