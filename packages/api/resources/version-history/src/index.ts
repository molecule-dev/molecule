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
export * from './authorizers/index.js'
export * from './diff.js'
export * from './handlers/index.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
