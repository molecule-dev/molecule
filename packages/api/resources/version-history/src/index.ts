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
 * - **Bond the DataStore before any call** (`setStore(...)`), or every service function and
 *   handler throws.
 * - **Restoring does NOT touch your resource.** `restoreVersion()` / `POST
 *   /versions/:versionId/restore` only append a new version holding the old snapshot — write that
 *   snapshot back to the parent row yourself. Likewise nothing captures versions automatically:
 *   call `createVersion()` from the parent's create/update path.
 * - `changes` is a SHALLOW per-top-level-field diff (`{ field: { before, after } }`), `null` on
 *   version 1; identical snapshots still append a version (with `changes: {}`).
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
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
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   createVersion,
 *   diffVersions,
 *   registerOwnershipResolver,
 *   restoreVersion,
 * } from '@molecule/api-resource-version-history'
 *
 * // Startup: bond the DataStore (the postgresql bond reads DATABASE_URL) and register an
 * // ownership resolver per versioned type — without it every route answers 404. `mlcl inject`
 * // then mounts `routes` (POST/GET /:resourceType/:resourceId/versions, …/versions/count,
 * // …/versions/:version, GET /versions/:versionId, POST /versions/:versionId/restore,
 * // GET /versions/:fromVersionId/diff/:toVersionId).
 * setStore(store)
 * const documentOwners = new Map([['doc-1', 'user-1']])
 * registerOwnershipResolver('document', ({ resourceId, userId }) => documentOwners.get(resourceId) === userId)
 *
 * // From the document's create/update handler (userId from the SESSION, never the body):
 * const v1 = await createVersion({
 *   resourceType: 'document',
 *   resourceId: 'doc-1',
 *   userId: 'user-1',
 *   snapshot: { title: 'Draft', body: 'Hello' },
 * })
 * const v2 = await createVersion({
 *   resourceType: 'document',
 *   resourceId: 'doc-1',
 *   userId: 'user-1',
 *   snapshot: { title: 'Final', body: 'Hello' },
 *   reason: 'autosave',
 * })
 * console.log(v2.version, v2.changes) // 2, { title: { before: 'Draft', after: 'Final' } }
 *
 * const diff = await diffVersions(v1.id, v2.id) // { from, to, changes } — null across resources
 * const restored = await restoreVersion(v1.id, 'user-1') // APPENDS v3 with v1's snapshot
 * console.log(diff?.changes, restored?.version, restored?.snapshot) // …, 3, { title: 'Draft', … }
 * ```
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './diff.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
