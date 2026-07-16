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
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
