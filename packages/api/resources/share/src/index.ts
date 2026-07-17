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
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
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
 * 1. **None of the five mutating handlers (`create`/`update`/`del` grants,
 *    `createLink`/`revokeLink` public links) are in `routes` or
 *    `requestHandlerMap`** — only the read-only `list`/`read`/`listLinks` and
 *    the public `resolveLink` route auto-mount. Note `list` (full ACL) and
 *    `listLinks` (share-link slugs) disclose manage-level data, so even though
 *    they auto-mount they self-enforce the SAME default-DENY ownership gate
 *    (`canAdministerResource`) as the mutating handlers — only `read` (the
 *    caller's OWN effective role) is an ungated read primitive. Mount the
 *    mutating handlers explicitly behind your own ownership check,
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
 *    registers one, every mutation — grant/update/revoke AND public-link
 *    mint/revoke — returns 403:
 *
 *    ```typescript
 *    import { setShareAdminAuthorizer } from '@molecule/api-resource-share'
 *    setShareAdminAuthorizer(async (resourceType, resourceId, userId) =>
 *      resourceType === 'project' && (await userOwnsOrAdminsProject(userId, resourceId)),
 *    )
 *    ```
 *
 * `update`/`del` (and `revokeLink`) resolve the stored row first to learn its
 * `(resourceType, resourceId)` and authorize the caller against THAT resource;
 * `create`/`createLink` authorize against the resource identity in the
 * (validated) request body.
 *
 * Tables: `src/__setup__/resource-shares.sql` and
 * `src/__setup__/resource-share-links.sql` create `resource-shares` and
 * `resource-share-links`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run them once — nothing at runtime
 * creates them.
 *
 * @e2e
 * ACCESS-CONTROL integration checklist — shares ARE the authorization
 * boundary, so prove each grant admits exactly who it should and no one
 * else; do not settle for "the CRUD compiled". Drive the real UI (live
 * preview, no mocks) with TWO signed-in accounts (a resource owner + a
 * collaborator) plus one signed-out/anonymous session, adapt every item to
 * this app's actual shareable resource (document, board, project, ...), and
 * check each box off one by one. A box you can't check is an access-control
 * bug to fix, never a skip — never mock the check or weaken a role gate to
 * go green:
 * - [ ] A grant admits EXACTLY its role and downstream enforcement honors
 *   it: share the resource with account B as 'viewer' -> B can open and read
 *   it, but every edit/save action is REFUSED (the resource's own handler
 *   calls requireRole(..., 'editor') and it throws forbidden); update/re-share
 *   B to 'editor' -> B can now edit. No role ever grants above its rank
 *   (viewer < commenter < editor < owner).
 * - [ ] A public share LINK admits its embedded role to whoever holds the
 *   slug: create a link, open its .../resource-share-links/resolve/:slug URL
 *   in the signed-out session -> access is granted at that role, scoped to
 *   that ONE resource only. The slug is the sole credential and is unguessable
 *   (32 random hex chars) — a made-up or altered slug resolves to 404.
 * - [ ] REVOKING cuts access off immediately: revoke B's grant -> B's next
 *   read/edit is refused with no stale window; revoke a link -> its slug now
 *   resolves to 404 for everyone, on the very next request.
 * - [ ] EXPIRY is enforced server-side: once a grant or link is past its
 *   expiresAt, effective role resolves to null / the link resolves to 404,
 *   exactly as if revoked — never rely on the client hiding an expired share.
 * - [ ] AUTHORIZATION is default-DENY and owner-only: a caller who does not
 *   administer the resource gets 403 when creating/updating/revoking a share
 *   or link on it, so no user can grant THEMSELVES access to a resource they
 *   don't own. A plain viewer/editor sharee cannot escalate — they can't
 *   re-share at a higher role or hand grants to others (the ownership gate
 *   refuses them), only an owner/admin can.
 * - [ ] The sharer is the SESSION user, server-set: a new grant's grantedBy
 *   (and a link's createdBy) is the authenticated caller's id from
 *   res.locals.session — never a value trusted from the request body.
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
