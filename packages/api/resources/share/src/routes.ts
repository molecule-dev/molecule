/**
 * Resource-share route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router. The public-link resolve endpoint intentionally has no
 * `authenticate` middleware: the slug itself is the credential.
 *
 * SECURITY: the mutating ACL routes — the raw grant/update/revoke mutations
 * (`create`, `update`, `del`) AND the public-link mint/revoke (`createLink`,
 * `revokeLink`) — are intentionally NOT auto-mounted here. The share table has no
 * inherent knowledge of who *owns* an arbitrary `(resourceType, resourceId)`, so
 * an always-on route would let any authenticated user grant themselves a role —
 * or mint/revoke a public share link — on ANY resource. Consumers must mount those
 * handlers explicitly behind a resource-ownership gate (and a
 * `setShareAdminAuthorizer` registration) — see the `@remarks` in `index.ts`. The
 * read-only `list`/`read`/`listLinks` routes and the public `resolveLink`
 * (slug-is-the-credential) route remain auto-mountable.
 *
 * @module
 */

/**
 * HTTP routes for share reads and public link tokens.
 */
export const routes = [
  // Direct ACL grants — READ ONLY here. The mutating create/update/del handlers
  // are exported for explicit, ownership-gated mounting; never auto-mount them.
  {
    method: 'get',
    path: '/resource-shares/:resourceType/:resourceId',
    handler: 'list',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/resource-shares/:resourceType/:resourceId/role',
    handler: 'read',
    middlewares: ['authenticate'],
  },

  // Public share links — READ ONLY here. The mutating createLink/revokeLink
  // handlers are exported for explicit, ownership-gated mounting (minting a link
  // for an arbitrary resource is the same privilege as a direct grant); never
  // auto-mount them.
  {
    method: 'get',
    path: '/resource-share-links/:resourceType/:resourceId',
    handler: 'listLinks',
    middlewares: ['authenticate'],
  },
  // Public — slug is the credential.
  { method: 'get', path: '/resource-share-links/resolve/:slug', handler: 'resolveLink' },
] as const
