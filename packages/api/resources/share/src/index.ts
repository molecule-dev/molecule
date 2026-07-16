/**
 * Resource-share resource for molecule.dev.
 *
 * Generic ACL primitive: collaborator role grants keyed by
 * (resourceType, resourceId, principalType, principalId), plus a separate
 * public link-share token table. Includes service helpers for role lookup,
 * effective-role resolution across user/team/public grants, and access
 * predicates that downstream resources can compose into their own
 * authorization checks.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-share'
 *
 * // Auto-mountable surface (via mlcl inject) — read-only + public link resolve:
 * // GET    /resource-shares/:resourceType/:resourceId        (full ACL — ownership-gated)
 * // GET    /resource-shares/:resourceType/:resourceId/role   (caller's own effective role)
 * // GET    /resource-share-links/:resourceType/:resourceId   (link list — ownership-gated)
 * // GET    /resource-share-links/resolve/:slug               (public — the slug is the credential)
 * //
 * // The MUTATING handlers (`create`/`update`/`del` grants, `createLink`/`revokeLink`)
 * // are intentionally NOT in `routes` — mount them yourself behind a
 * // resource-ownership gate. See @remarks.
 * ```
 *
 * @example
 * ```typescript
 * import { canAccess, requireRole } from '@molecule/api-resource-share'
 *
 * // Inside another resource's handler:
 * await requireRole('document', docId, 'editor', userId, teamIds)
 * ```
 *
 * @remarks
 * SECURITY — the raw grant/update/revoke handlers DENY by default (every
 * mutation returns 403 until an ownership authorizer is registered) and MUST
 * be mounted behind a resource-ownership gate; never auto-mount them. The
 * share table has no inherent knowledge of who *owns* an arbitrary
 * `(resourceType, resourceId)`, so without a gate any authenticated user could
 * `POST /resource-shares` to grant themselves the highest role on ANY resource
 * (or revoke/escalate others' grants by id).
 *
 * Two things enforce this:
 *
 * 1. **`create`/`update`/`del` are NOT in `routes` or `requestHandlerMap`** —
 *    only the read-only `list`/`read`/`listLinks` and the public-link routes
 *    auto-mount. Note `list` (full ACL) and `listLinks` (share-link slugs)
 *    disclose manage-level data, so even though they auto-mount they self-enforce
 *    the SAME default-DENY ownership gate (`canAdministerResource`) as the
 *    mutating handlers — only `read` (the caller's OWN effective role) is an
 *    ungated read primitive. Mount the mutating handlers explicitly behind your
 *    own ownership check,
 *    with the resource identity fixed by the server (never trusted from the
 *    request body):
 *
 *    ```typescript
 *    import { create as grantShareHandler } from '@molecule/api-resource-share'
 *    router.post('/projects/:projectId/shares', async (req, res) => {
 *      if (!(await assertProjectAccess(req, res))) return // owner/admin gate
 *      await grantShareHandler(req, res)
 *    })
 *    ```
 *
 * 2. **Defense in depth: the handlers themselves DENY by default.** They call
 *    a registerable ownership authorizer before any mutation; until an app
 *    registers one, every grant/update/revoke returns 403:
 *
 *    ```typescript
 *    import { setShareAdminAuthorizer } from '@molecule/api-resource-share'
 *    setShareAdminAuthorizer(async (resourceType, resourceId, userId) =>
 *      resourceType === 'project' && (await userOwnsOrAdminsProject(userId, resourceId)),
 *    )
 *    ```
 *
 * `update`/`del` resolve the share row first to learn its
 * `(resourceType, resourceId)` and authorize the caller against THAT resource.
 *
 * Tables: `src/__setup__/resource-shares.sql` and
 * `src/__setup__/resource-share-links.sql` create `resource-shares` and
 * `resource-share-links`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run them once — nothing at runtime
 * creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
