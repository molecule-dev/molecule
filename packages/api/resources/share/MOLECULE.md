# @molecule/api-resource-share

Resource-share resource for molecule.dev.

Generic ACL primitive: collaborator role grants keyed by
(resourceType, resourceId, principalType, principalId), plus a separate
public link-share token table. Includes service helpers for role lookup,
effective-role resolution across user/team/public grants, and access
predicates that downstream resources can compose into their own
authorization checks.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-share'

// Auto-mountable surface (via mlcl inject) — read-only + public link resolve:
// GET    /resource-shares/:resourceType/:resourceId        (full ACL — ownership-gated)
// GET    /resource-shares/:resourceType/:resourceId/role   (caller's own effective role)
// GET    /resource-share-links/:resourceType/:resourceId   (link list — ownership-gated)
// GET    /resource-share-links/resolve/:slug               (public — the slug is the credential)
//
// The MUTATING handlers (`create`/`update`/`del` grants, `createLink`/`revokeLink`)
// are intentionally NOT in `routes` — mount them yourself behind a
// resource-ownership gate. See @remarks.
```

```typescript
import { canAccess, requireRole } from '@molecule/api-resource-share'

// Inside another resource's handler:
await requireRole('document', docId, 'editor', userId, teamIds)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-share @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `CreateShareLinkInput`

Input for creating a public share link.

```typescript
interface CreateShareLinkInput {
  /** Resource type. */
  resourceType: string
  /** Resource ID. */
  resourceId: string
  /** Role granted to anyone holding the link. */
  role: ShareRole
  /** Optional expiry timestamp (ISO 8601). */
  expiresAt?: string | null
  /** Optional ID of the creating user. */
  createdBy?: string | null
}
```

#### `GrantShareInput`

Input for granting a share.

```typescript
interface GrantShareInput {
  /** Resource type (e.g. 'document'). */
  resourceType: string
  /** Resource ID. */
  resourceId: string
  /** Principal category. */
  principalType: PrincipalType
  /** Principal ID (user ID, team ID, or '*' for public). */
  principalId: string
  /** Role to grant. */
  role: ShareRole
  /** Optional expiry timestamp (ISO 8601). */
  expiresAt?: string | null
  /** Optional ID of the granting user. */
  grantedBy?: string | null
}
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}
```

#### `Share`

A persisted share grant linking one principal to one resource at one role.

```typescript
interface Share {
  /** Unique share identifier. */
  id: string
  /** The type of resource being shared (e.g. 'document', 'board'). */
  resourceType: string
  /** The ID of the resource being shared. */
  resourceId: string
  /** The category of principal receiving the grant. */
  principalType: PrincipalType
  /** The ID of the principal (user ID, team ID, or '*' for public). */
  principalId: string
  /** The role granted on the resource. */
  role: ShareRole
  /** ID of the user who granted the share, if known. */
  grantedBy: string | null
  /** Optional expiry timestamp (ISO 8601). After this the grant is inactive. */
  expiresAt: string | null
  /** When the share was created (ISO 8601). */
  createdAt: string
  /** When the share was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ShareLink`

A public-link share token. Anyone holding the slug can access the
resource at the embedded role until the link is revoked or expires.

```typescript
interface ShareLink {
  /** Unique link identifier. */
  id: string
  /** The type of resource exposed by this link. */
  resourceType: string
  /** The ID of the resource exposed by this link. */
  resourceId: string
  /** Opaque slug/token used in the public URL. */
  slug: string
  /** The role granted to anyone who follows this link. */
  role: ShareRole
  /** ID of the user who created the link, if known. */
  createdBy: string | null
  /** Optional expiry timestamp (ISO 8601). After this the link is inactive. */
  expiresAt: string | null
  /** When the link was revoked (ISO 8601), or `null` if active. */
  revokedAt: string | null
  /** When the link was created (ISO 8601). */
  createdAt: string
  /** When the link was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ShareQuery`

Filters for listing shares for a resource.

```typescript
interface ShareQuery {
  /** Filter by principal type. */
  principalType?: PrincipalType
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}
```

### Types

#### `PrincipalType`

Categories of principals that can hold a share grant.

```typescript
type PrincipalType = 'user' | 'team' | 'public'
```

#### `ShareAdminAuthorizer`

Resource-ownership predicate: returns `true` when `userId` is permitted to
administer (grant / update / revoke) shares on the given resource. This is
the gate that decides who may hand out access — it is deliberately distinct
from {@link resolveRole}, which answers "what can this user already do",
because the raw share table has no inherent knowledge of which user *owns*
an arbitrary `(resourceType, resourceId)`. Only the consuming app does.

```typescript
type ShareAdminAuthorizer = (
  resourceType: string,
  resourceId: string,
  userId: string,
) => Promise<boolean> | boolean
```

#### `ShareRole`

A role assigned to a principal on a shared resource.

```typescript
type ShareRole = (typeof SHARE_ROLES)[number]
```

### Functions

#### `canAccess(resourceType, resourceId, required, userId, teamIds)`

Convenience predicate: does the user have at least the required role on
the resource?

```typescript
function canAccess(resourceType: string, resourceId: string, required: "viewer" | "commenter" | "editor" | "owner", userId: string | null, teamIds?: string[]): Promise<boolean>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `required` — Minimum role.
- `userId` — The user ID, or `null` for anonymous.
- `teamIds` — IDs of teams the user belongs to.

**Returns:** `true` if the effective role satisfies `required`.

#### `canAdministerResource(resourceType, resourceId, userId)`

Default-DENY ownership gate. Returns `true` only when an authorizer has been
registered via {@link setShareAdminAuthorizer} AND that authorizer allows
`userId` to administer the resource. When no authorizer is registered, this
returns `false` — the share grant/update/revoke handlers respond 403.

```typescript
function canAdministerResource(resourceType: string, resourceId: string, userId: string): Promise<boolean>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `userId` — The authenticated user ID.

**Returns:** `true` if the mutation is allowed, otherwise `false`.

#### `compareRoles(a, b)`

Compares two roles. Returns 0 when equal, negative when `a < b`, positive
when `a > b`.

```typescript
function compareRoles(a: "viewer" | "commenter" | "editor" | "owner", b: "viewer" | "commenter" | "editor" | "owner"): number
```

- `a` — The first role.
- `b` — The second role.

**Returns:** Comparison result based on `SHARE_ROLES` ordering.

#### `create(req, res)`

Grants a share on a resource. Idempotent — re-granting to the same
principal updates the existing role/expiry instead of duplicating.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with grant body (resourceType, resourceId, principalType, principalId, role, expiresAt?).
- `res` — The response object.

#### `createLink(req, res)`

Creates a public share link for a resource.

```typescript
function createLink(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with link body (resourceType, resourceId, role, expiresAt?).
- `res` — The response object.

#### `createShareLink(input)`

Creates a public share link for a resource.

```typescript
function createShareLink(input: CreateShareLinkInput): Promise<ShareLink>
```

- `input` — The link input.

**Returns:** The persisted link including its slug.

#### `del(req, res)`

Revokes a share grant by its ID.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with share `id` param.
- `res` — The response object.

#### `generateSlug()`

Generates an opaque slug for a public share link.

```typescript
function generateSlug(): string
```

**Returns:** A 32-character lowercase alphanumeric slug.

#### `getEffectiveRole(resourceType, resourceId, userId, teamIds)`

Returns the highest role a user has on a resource across direct user
grants, team grants the user is a member of, and any active public grant.

```typescript
function getEffectiveRole(resourceType: string, resourceId: string, userId: string | null, teamIds?: string[]): Promise<"viewer" | "commenter" | "editor" | "owner" | null>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `userId` — The user ID, or `null` for an anonymous viewer.
- `teamIds` — IDs of teams the user belongs to.

**Returns:** The highest active role, or `null` when none applies.

#### `getPrincipalRole(resourceType, resourceId, principalType, principalId)`

Returns the role a single principal holds on a resource, accounting for
expiry. Returns `null` when no active grant exists.

```typescript
function getPrincipalRole(resourceType: string, resourceId: string, principalType: PrincipalType, principalId: string): Promise<"viewer" | "commenter" | "editor" | "owner" | null>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `principalType` — Principal type.
- `principalId` — Principal ID.

**Returns:** The active role, or `null`.

#### `getShareAdminAuthorizer()`

Returns the currently-registered share-admin authorizer, or `null` when
none has been registered.

```typescript
function getShareAdminAuthorizer(): ShareAdminAuthorizer | null
```

**Returns:** The registered authorizer, or `null`.

#### `getShareById(id)`

Fetches a single share grant by its ID. Used by the update/revoke handlers
to resolve a share's `(resourceType, resourceId)` before authorizing the
caller against THAT resource.

```typescript
function getShareById(id: string): Promise<Share | null>
```

- `id` — The share ID.

**Returns:** The share, or `null` if not found.

#### `grantShare(input)`

Grants a share to a principal. If a grant already exists for the same
(resource, principal) tuple, its role and expiry are updated.

```typescript
function grantShare(input: GrantShareInput): Promise<Share>
```

- `input` — The share grant input.

**Returns:** The persisted share.

#### `isExpired(timestamp, now)`

Returns `true` when an ISO 8601 timestamp is in the past.

```typescript
function isExpired(timestamp: string | null | undefined, now?: number): boolean
```

- `timestamp` — ISO 8601 string or `null`.
- `now` — Current time (defaults to `Date.now()`).

**Returns:** `true` when `timestamp` is non-null and already elapsed.

#### `list(req, res)`

Lists shares attached to a resource, identified by `resourceType` and
`resourceId` query/path params.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType`, `resourceId` params and optional pagination/filter query.
- `res` — The response object.

#### `listLinks(req, res)`

Lists all public share links attached to a resource.

```typescript
function listLinks(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `listShareLinks(resourceType, resourceId)`

Lists all share links attached to a resource.

```typescript
function listShareLinks(resourceType: string, resourceId: string): Promise<ShareLink[]>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.

**Returns:** Active and revoked links, newest first.

#### `listShares(resourceType, resourceId, options)`

Lists shares attached to a single resource, with pagination.

```typescript
function listShares(resourceType: string, resourceId: string, options?: ShareQuery): Promise<PaginatedResult<Share>>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `options` — Optional filters.

**Returns:** Paginated list of shares.

#### `listSharesForUser(userId)`

Lists every active resource a user can reach via direct user grants.

```typescript
function listSharesForUser(userId: string): Promise<Share[]>
```

- `userId` — The user ID.

**Returns:** Array of `(resourceType, resourceId, role)` records.

#### `read(req, res)`

Returns the effective role the current user has on the resource,
considering direct user grants, team grants (if `teamIds` provided in
`res.locals.session`), and any active public grant.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `requireRole(resourceType, resourceId, required, userId, teamIds)`

Throws `Error('forbidden')` unless the user has at least the required
role on the resource. Intended for use inside other resource handlers
that integrate with shares.

```typescript
function requireRole(resourceType: string, resourceId: string, required: "viewer" | "commenter" | "editor" | "owner", userId: string | null, teamIds?: string[]): Promise<void>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `required` — Minimum role required.
- `userId` — User ID, or `null` for anonymous.
- `teamIds` — Team IDs the user belongs to.

#### `resolveLink(req, res)`

Resolves a public share-link slug to its `ShareLink` record. Returns
404 when the slug is unknown, revoked, or expired. Does NOT require
authentication — the slug is the credential.

```typescript
function resolveLink(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `slug` param.
- `res` — The response object.

#### `resolveRole(resourceType, resourceId, userId, teamIds)`

Resolves the highest active role a user has on a resource, considering
direct user grants, team grants, and any active public grant. Returns
`null` when no active grant applies.

```typescript
function resolveRole(resourceType: string, resourceId: string, userId: string | null, teamIds?: string[]): Promise<"viewer" | "commenter" | "editor" | "owner" | null>
```

- `resourceType` — Resource type (e.g. 'document').
- `resourceId` — Resource ID.
- `userId` — User ID, or `null` for anonymous viewers.
- `teamIds` — Team IDs the user belongs to.

**Returns:** The effective role, or `null`.

#### `resolveShareLink(slug)`

Resolves a public share-link slug to its `ShareLink` record. Returns
`null` if the slug is unknown, revoked, or expired.

```typescript
function resolveShareLink(slug: string): Promise<ShareLink | null>
```

- `slug` — The opaque slug from the URL.

**Returns:** The active link, or `null`.

#### `revokeLink(req, res)`

Revokes a public share link by ID. Idempotent.

```typescript
function revokeLink(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with link `id` param.
- `res` — The response object.

#### `revokeShare(resourceType, resourceId, principalType, principalId)`

Revokes a single share grant.

```typescript
function revokeShare(resourceType: string, resourceId: string, principalType: PrincipalType, principalId: string): Promise<void>
```

- `resourceType` — Resource type.
- `resourceId` — Resource ID.
- `principalType` — Principal type.
- `principalId` — Principal ID.

#### `revokeShareById(id)`

Revokes a share grant by its ID.

```typescript
function revokeShareById(id: string): Promise<void>
```

- `id` — Share ID.

#### `revokeShareLink(id)`

Revokes a public share link by ID. Idempotent — sets `revokedAt` if not
already set.

```typescript
function revokeShareLink(id: string): Promise<ShareLink | null>
```

- `id` — The link ID.

**Returns:** The updated link, or `null` if not found.

#### `roleSatisfies(role, required)`

Determines whether `role` is at least as privileged as `required`.

```typescript
function roleSatisfies(role: "viewer" | "commenter" | "editor" | "owner", required: "viewer" | "commenter" | "editor" | "owner"): boolean
```

- `role` — The role held.
- `required` — The minimum role required.

**Returns:** `true` when `role >= required`.

#### `setShareAdminAuthorizer(authorizer)`

Registers the resource-ownership authorizer consulted by the share
grant/update/revoke handlers before any mutation. **Until an app registers
one, every share mutation is DENIED (secure by default)** — the share table
cannot know who owns an arbitrary resource, so the consuming app MUST supply
that knowledge (e.g. "is `userId` the owner of / an admin on this project?").

Pass `null` to clear a previously-registered authorizer (restores default
deny).

```typescript
function setShareAdminAuthorizer(authorizer: ShareAdminAuthorizer | null): void
```

- `authorizer` — The ownership predicate, or `null` to clear.

#### `update(req, res)`

Updates an existing share's role and/or expiry.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with share `id` param and patch body.
- `res` — The response object.

#### `updateShare(id, patch)`

Updates the role and/or expiry of an existing share by ID.

```typescript
function updateShare(id: string, patch: { role?: ShareRole; expiresAt?: string | null; }): Promise<Share | null>
```

- `id` — The share ID.
- `patch` — Fields to update.

**Returns:** The updated share, or `null` if not found.

### Constants

#### `createShareLinkSchema`

Schema for creating a public share link.

```typescript
const createShareLinkSchema: z.ZodObject<{ resourceType: z.ZodString; resourceId: z.ZodString; role: z.ZodEnum<{ viewer: "viewer"; commenter: "commenter"; editor: "editor"; owner: "owner"; }>; expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `grantShareSchema`

Schema for granting a share to a principal.

```typescript
const grantShareSchema: z.ZodObject<{ resourceType: z.ZodString; resourceId: z.ZodString; principalType: z.ZodEnum<{ user: "user"; team: "team"; public: "public"; }>; principalId: z.ZodString; role: z.ZodEnum<{ viewer: "viewer"; commenter: "commenter"; editor: "editor"; owner: "owner"; }>; expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for the auto-mountable resource-share routes (see `routes.ts`).

SECURITY: the mutating `create` / `update` / `del` grant handlers are
deliberately absent — they are NOT part of the auto-mount surface because
the share table cannot know who owns an arbitrary resource. Import them
directly from `@molecule/api-resource-share` and mount them behind your own
resource-ownership gate (plus a `setShareAdminAuthorizer` registration).

```typescript
const requestHandlerMap: { readonly list: typeof list; readonly read: typeof read; readonly createLink: typeof createLink; readonly listLinks: typeof listLinks; readonly revokeLink: typeof revokeLink; readonly resolveLink: typeof resolveLink; }
```

#### `routes`

HTTP routes for share reads and public link tokens.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/resource-shares/:resourceType/:resourceId"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/resource-shares/:resourceType/:resourceId/role"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/resource-share-links/:resourceType/:resourceId"; readonly handler: "listLinks"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/resource-share-links/resolve/:slug"; readonly handler: "resolveLink"; }]
```

#### `SHARE_ROLES`

Available roles, ordered from least to most privileged. Higher index
implies all lower-indexed permissions.

```typescript
const SHARE_ROLES: readonly ["viewer", "commenter", "editor", "owner"]
```

#### `updateShareSchema`

Schema for updating an existing share's role and/or expiry.

```typescript
const updateShareSchema: z.ZodObject<{ role: z.ZodOptional<z.ZodEnum<{ viewer: "viewer"; commenter: "commenter"; editor: "editor"; owner: "owner"; }>>; expiresAt: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`
- `zod`

.
```

## E2E Tests

ACCESS-CONTROL integration checklist — shares ARE the authorization
boundary, so prove each grant admits exactly who it should and no one
else; do not settle for "the CRUD compiled". Drive the real UI (live
preview, no mocks) with TWO signed-in accounts (a resource owner + a
collaborator) plus one signed-out/anonymous session, adapt every item to
this app's actual shareable resource (document, board, project, ...), and
check each box off one by one. A box you can't check is an access-control
bug to fix, never a skip — never mock the check or weaken a role gate to
go green:
- [ ] A grant admits EXACTLY its role and downstream enforcement honors
  it: share the resource with account B as 'viewer' -> B can open and read
  it, but every edit/save action is REFUSED (the resource's own handler
  calls requireRole(..., 'editor') and it throws forbidden); update/re-share
  B to 'editor' -> B can now edit. No role ever grants above its rank
  (viewer < commenter < editor < owner).
- [ ] A public share LINK admits its embedded role to whoever holds the
  slug: create a link, open its .../resource-share-links/resolve/:slug URL
  in the signed-out session -> access is granted at that role, scoped to
  that ONE resource only. The slug is the sole credential and is unguessable
  (32 random hex chars) — a made-up or altered slug resolves to 404.
- [ ] REVOKING cuts access off immediately: revoke B's grant -> B's next
  read/edit is refused with no stale window; revoke a link -> its slug now
  resolves to 404 for everyone, on the very next request.
- [ ] EXPIRY is enforced server-side: once a grant or link is past its
  expiresAt, effective role resolves to null / the link resolves to 404,
  exactly as if revoked — never rely on the client hiding an expired share.
- [ ] AUTHORIZATION is default-DENY and owner-only: a caller who does not
  administer the resource gets 403 when creating/updating/revoking a share
  or link on it, so no user can grant THEMSELVES access to a resource they
  don't own. A plain viewer/editor sharee cannot escalate — they can't
  re-share at a higher role or hand grants to others (the ownership gate
  refuses them), only an owner/admin can.
- [ ] The sharer is the SESSION user, server-set: a new grant's grantedBy
  (and a link's createdBy) is the authenticated caller's id from
  res.locals.session — never a value trusted from the request body.
