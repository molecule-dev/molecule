/**
 * Append-only version history resource for molecule.dev.
 *
 * Polymorphic, append-only `versions` table that captures full snapshots of
 * any resource type, plus a shallow diff against the prior version. Routes
 * surface list / read / count / diff / restore — there is no UPDATE or
 * DELETE for individual versions, by design. Restoring a prior version
 * appends a new version whose snapshot equals the target's; the existing
 * rows are never mutated.
 *
 * @remarks
 * **Security — the raw routes are NOT open.** Snapshots can contain any
 * tenant's data, so every route requires an authenticated session AND each
 * handler re-derives the caller from `res.locals.session.userId` and authorizes
 * access to the *parent* resource via {@link isVersionAuthorized}. Access is
 * **fail-closed and pluggable**: because the store is polymorphic it cannot
 * know who owns an arbitrary `(resourceType, resourceId)`, so an app mounting
 * these routes MUST register a {@link VersionOwnershipResolver} per resource
 * type at startup via {@link registerOwnershipResolver} — until it does, every
 * read/list/diff/restore returns 404 (no existence leak) rather than exposing
 * another tenant's snapshots. Cross-tenant admin access is opt-in via the
 * {@link versionHistoryAdmin} middleware. Do NOT mount the raw routes without
 * either a registered resolver or your own resource-ownership gate.
 *
 * Tables: `src/__setup__/versions.sql` creates `versions`. An mlcl-scaffolded
 * API replays `__setup__/*.sql` automatically on migrate; anywhere else run it
 * once — nothing at runtime creates them. Handler errors flow through `t()`
 * with English defaults; install `@molecule/api-locales-resource-version-history`
 * and register it with `registerLocaleModule` for translations.
 *
 * @e2e
 * Versioning-correctness checklist — drive the real UI (live preview, no mocks)
 * wherever this app surfaces revisions/history, adapt each item to the actual
 * screens, and check every box. A box you can't check is a versioning bug to
 * fix — not a skip. The point is to PROVE versions are recorded, ordered,
 * diffable, restorable, and tamper-evident, not just that CRUD compiles:
 * - [ ] Editing a versioned resource RECORDS a new version: after a save the
 *   history count grows by exactly one, the prior version is RETAINED (its
 *   snapshot unchanged — not overwritten), and the new row carries the next
 *   1-based `version` number (previous + 1), the acting user as `userId`
 *   (author), and a fresh `createdAt`. The very first save has `changes: null`;
 *   later saves record a `changes` shallow diff (before/after per field)
 *   against the prior snapshot.
 * - [ ] Listing history returns versions newest-first (by `version` descending)
 *   with `total` reflecting every version, each row showing its number, author
 *   (`userId`), `reason`, and `createdAt` — and the count only ever GROWS across
 *   saves (append-only: no save shrinks or rewrites history).
 * - [ ] Viewing an old version shows that version's full `snapshot`; diffing two
 *   versions renders the per-field `changes` as a forward delta (the
 *   lower-numbered version is `from`, the higher is `to`), and a diff across two
 *   different resources is rejected (no cross-resource diff).
 * - [ ] Reverting/restoring an old version makes it current AND itself APPENDS a
 *   new version whose snapshot equals the target's — the prior current version
 *   and the restored-from version both still exist afterward, the new version's
 *   number is the next in sequence, its author is the acting user, and its
 *   `reason` records the restore (default `Restored from version <n>`). History
 *   is never lost by a revert.
 * - [ ] Retention is append-only and unbounded — nothing prunes: there is no UI
 *   or endpoint to edit or delete an individual version (no UPDATE/DELETE
 *   route), so a resource's history count never decreases. (If the app layers
 *   its own retention policy on top, verify it prunes oldest-first per that
 *   policy and never drops the current version.)
 * - [ ] AUTHORIZATION — a resource's version history is reachable only by a user
 *   who can access that resource: a different user id-guessing the
 *   `(resourceType, resourceId)` or a `versionId` gets 404 (no existence leak),
 *   never another tenant's history, and with no ownership resolver registered
 *   every read/list/diff/restore fails closed. The version author is always the
 *   session user (`res.locals.session.userId`), never a body-supplied id — a
 *   caller cannot attribute a change to someone else. A user cannot fabricate or
 *   delete history to hide a change: versions are append-only and a revert
 *   appends rather than rewrites; only the opt-in `versionHistoryAdmin`
 *   middleware crosses tenants.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   routes,
 *   requestHandlerMap,
 *   createVersion,
 *   registerOwnershipResolver,
 * } from '@molecule/api-resource-version-history'
 *
 * // REQUIRED before mounting the routes: tell version-history how to check
 * // parent-resource ownership for each resource type you version. Without this
 * // every read/list/diff/restore fails closed (404) — the routes are never open.
 * registerOwnershipResolver('document', async ({ resourceId, userId }) => {
 *   const doc = await findById('documents', resourceId)
 *   return doc?.userId === userId
 * })
 *
 * // Wire routes via mlcl inject:
 * //   POST   /:resourceType/:resourceId/versions
 * //   GET    /:resourceType/:resourceId/versions
 * //   GET    /:resourceType/:resourceId/versions/count
 * //   GET    /:resourceType/:resourceId/versions/:version
 * //   GET    /versions/:versionId
 * //   POST   /versions/:versionId/restore
 * //   GET    /versions/:fromVersionId/diff/:toVersionId
 *
 * // Or call the service directly from another resource's update handler.
 * // The acting user ALWAYS comes from the session (res.locals.session) —
 * // never from the request body:
 * const userId = (res.locals.session as { userId?: string } | undefined)?.userId
 * await createVersion({
 *   resourceType: 'document',
 *   resourceId: doc.id,
 *   userId: userId ?? null,
 *   snapshot: doc,
 *   reason: 'autosave',
 * })
 * ```
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './authorizers/index.js'
export * from './diff.js'
export * from './handlers/index.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
