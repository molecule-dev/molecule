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
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
