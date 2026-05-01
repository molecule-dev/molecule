# @molecule/api-resource-workspace

Workspace resource for molecule.dev.

Ships the unified `workspaces`, `workspace_members`, `workspace_invites`
schema, role-aware authz helpers (`owner` / `admin` / `member`), and
an invite-by-email flow with single-use tokens. Replaces ad-hoc
per-app workspace tables.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-workspace'

// Wire routes into your Express app via mlcl inject:
//   POST   /workspaces
//   GET    /workspaces
//   GET    /workspaces/:id
//   PATCH  /workspaces/:id
//   DELETE /workspaces/:id
//   GET    /workspaces/:id/members
//   PATCH  /workspaces/:id/members/:userId
//   DELETE /workspaces/:id/members/:userId
//   POST   /workspaces/:id/invites
//   GET    /workspaces/:id/invites
//   DELETE /workspaces/:id/invites/:inviteId
//   POST   /workspaces/invites/accept
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-workspace
```

## API

### Interfaces

#### `CreateWorkspaceInput`

Input payload for creating a workspace.

```typescript
interface CreateWorkspaceInput {
  /** The workspace's display name. */
  name: string
  /** Optional URL-safe slug; auto-generated from `name` when omitted. */
  slug?: string
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

#### `UpdateWorkspaceInput`

Input payload for updating a workspace.

```typescript
interface UpdateWorkspaceInput {
  /** Updated workspace display name. */
  name?: string
  /** Updated URL-safe slug. */
  slug?: string
}
```

#### `Workspace`

A workspace — a shared scope owned by one user with optional members.

```typescript
interface Workspace {
  /** Unique workspace identifier. */
  id: string
  /** The ID of the user who owns the workspace. */
  ownerId: string
  /** Human-readable workspace name. */
  name: string
  /** URL-safe slug for the workspace. */
  slug: string
  /** When the workspace was created (ISO 8601). */
  createdAt: string
  /** When the workspace was last updated (ISO 8601). */
  updatedAt: string
  /** Soft-delete timestamp; `null` for active workspaces (ISO 8601). */
  deletedAt: string | null
}
```

#### `WorkspaceInvite`

A pending email invitation to join a workspace.

```typescript
interface WorkspaceInvite {
  /** Unique invite identifier. */
  id: string
  /** The workspace the invitee will join on accept. */
  workspaceId: string
  /** The invitee's email address. */
  email: string
  /** The role the invitee will receive on accept. */
  role: WorkspaceRole
  /** Opaque single-use token used to accept the invite. */
  token: string
  /** ISO 8601 timestamp at which the invite stops being valid. */
  expiresAt: string
  /** When the invite was created (ISO 8601). */
  createdAt: string
  /** When the invite was accepted (ISO 8601), or `null` if pending. */
  acceptedAt: string | null
}
```

#### `WorkspaceMember`

Membership row linking a user to a workspace with a role.

```typescript
interface WorkspaceMember {
  /** The workspace this membership belongs to. */
  workspaceId: string
  /** The member's user ID. */
  userId: string
  /** The member's role within the workspace. */
  role: WorkspaceRole
  /** When the user joined the workspace (ISO 8601). */
  joinedAt: string
}
```

#### `WorkspaceQuery`

Query options for listing workspaces a user belongs to.

```typescript
interface WorkspaceQuery {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}
```

### Types

#### `WorkspaceRole`

A workspace member's role within a workspace.

```typescript
type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]
```

### Functions

#### `accept(req, res)`

Accepts an invite using its single-use token. The current user joins
the invite's workspace with the invite's role.

```typescript
function accept(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with body `{ token }`.
- `res` — The response object.

#### `acceptInvite(token, userId)`

Accepts an invite and creates the membership row. Idempotent — if the
user is already a member, returns the existing membership without
downgrading the role.

```typescript
function acceptInvite(token: string, userId: string): Promise<WorkspaceMember>
```

- `token` — Single-use invite token.
- `userId` — The accepting user's id.

**Returns:** The new (or existing) membership row.

#### `assertMember(workspaceId, userId, minRole)`

Asserts that `userId` is a member of `workspaceId` with at least `minRole`.
Throws when the user is not a member or has insufficient role.

```typescript
function assertMember(workspaceId: string, userId: string, minRole?: "member" | "admin" | "owner"): Promise<void>
```

- `workspaceId` — Workspace to check membership in.
- `userId` — User whose membership to check.
- `minRole` — Minimum role required (defaults to `member`).

#### `create(req, res)`

Creates a new workspace owned by the current user.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with the workspace creation body (`name`, optional `slug`).
- `res` — The response object.

#### `createWorkspace(ownerId, input)`

Creates a workspace and the owner's membership row.

```typescript
function createWorkspace(ownerId: string, input: CreateWorkspaceInput): Promise<Workspace>
```

- `ownerId` — The user creating (and owning) the workspace.
- `input` — The new workspace's name and optional slug.

**Returns:** The created workspace.

#### `del(req, res)`

Soft-deletes a workspace. Caller must be the owner.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` param.
- `res` — The response object.

#### `deleteWorkspace(id)`

Soft-deletes a workspace and removes all member rows.

```typescript
function deleteWorkspace(id: string): Promise<void>
```

- `id` — Workspace id.

#### `generateInviteToken()`

Generates an opaque single-use invite token.

```typescript
function generateInviteToken(): string
```

**Returns:** A hex-encoded random token.

#### `getMembership(workspaceId, userId)`

Looks up a single membership row.

```typescript
function getMembership(workspaceId: string, userId: string): Promise<WorkspaceMember | null>
```

- `workspaceId` — The workspace.
- `userId` — The user.

**Returns:** The membership, or `null` when the user is not a member.

#### `getPendingInvite(token)`

Looks up an invite by token (pending invites only).

```typescript
function getPendingInvite(token: string): Promise<WorkspaceInvite | null>
```

- `token` — The opaque token issued at invite time.

**Returns:** The pending invite, or `null` when missing/expired/accepted.

#### `getWorkspace(id)`

Reads a single workspace by id (active rows only).

```typescript
function getWorkspace(id: string): Promise<Workspace | null>
```

- `id` — Workspace id.

**Returns:** The workspace, or `null` when missing or soft-deleted.

#### `invite(req, res)`

Creates a pending invite for a workspace. Caller must be at least an admin.

```typescript
function invite(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` (workspace id) param and body `{ email, role? }`.
- `res` — The response object.

#### `inviteMember(workspaceId, email, role, ttlMs)`

Creates an invite record for an email. Idempotent on (workspace, email)
pending invites — returns the existing pending invite if one exists.

```typescript
function inviteMember(workspaceId: string, email: string, role?: "member" | "admin" | "owner", ttlMs?: number): Promise<WorkspaceInvite>
```

- `workspaceId` — The workspace to invite into.
- `email` — The invitee's email.
- `role` — The role to grant on accept (defaults to `member`).
- `ttlMs` — Override the default 7-day expiry (in milliseconds).

**Returns:** The pending invite record.

#### `list(req, res)`

Lists workspaces the current user is a member of, paginated.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional `limit`/`offset` query params.
- `res` — The response object.

#### `listAll(req, res)`

Lists members of a workspace. Caller must be a member.

```typescript
function listAll(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` (workspace id) param.
- `res` — The response object.

#### `listInvites(req, res)`

Lists pending invites for a workspace. Caller must be at least an admin.

```typescript
function listInvites(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` (workspace id) param.
- `res` — The response object.

#### `listMembers(workspaceId)`

Lists all members of a workspace.

```typescript
function listMembers(workspaceId: string): Promise<WorkspaceMember[]>
```

- `workspaceId` — The workspace.

**Returns:** Array of memberships.

#### `listPendingInvites(workspaceId)`

Lists pending invites for a workspace.

```typescript
function listPendingInvites(workspaceId: string): Promise<WorkspaceInvite[]>
```

- `workspaceId` — The workspace.

**Returns:** Array of pending (unaccepted, unexpired) invites.

#### `listWorkspacesForUser(userId, options)`

Lists workspaces the user is a member of, paginated.

```typescript
function listWorkspacesForUser(userId: string, options?: WorkspaceQuery): Promise<PaginatedResult<Workspace>>
```

- `userId` — The user whose workspaces to list.
- `options` — Pagination options.

**Returns:** A paginated set of workspaces.

#### `read(req, res)`

Reads a single workspace by id. Caller must be a member.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` param.
- `res` — The response object.

#### `remove(req, res)`

Removes a member from a workspace. Caller must be at least an admin
(or removing themself). Refuses to remove the last owner.

```typescript
function remove(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` (workspace) and `:userId` params.
- `res` — The response object.

#### `removeMember(workspaceId, userId)`

Removes a member from a workspace. Refuses to remove the last owner.

```typescript
function removeMember(workspaceId: string, userId: string): Promise<void>
```

- `workspaceId` — Workspace.
- `userId` — Member to remove.

#### `revoke(req, res)`

Revokes a pending invite. Caller must be at least an admin of the
workspace the invite belongs to.

```typescript
function revoke(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` (workspace) and `:inviteId` params.
- `res` — The response object.

#### `revokeInvite(workspaceId, inviteId)`

Revokes (deletes) a pending invite.

```typescript
function revokeInvite(workspaceId: string, inviteId: string): Promise<void>
```

- `workspaceId` — The workspace.
- `inviteId` — The invite to revoke.

#### `roleAtLeast(actual, required)`

Compares two roles using the canonical strength ordering
(`member` < `admin` < `owner`).

```typescript
function roleAtLeast(actual: "member" | "admin" | "owner", required: "member" | "admin" | "owner"): boolean
```

- `actual` — The role the member actually has.
- `required` — The minimum role required.

**Returns:** `true` when `actual` is at least as strong as `required`.

#### `slugify(input)`

Slugify a free-form workspace name into URL-safe `[a-z0-9-]+`.

```typescript
function slugify(input: string): string
```

- `input` — Source string to slugify.

**Returns:** Lowercased, hyphen-separated slug.

#### `update(req, res)`

Updates a workspace's mutable fields. Caller must be at least an admin.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` param and patch body.
- `res` — The response object.

#### `updateMemberRole(workspaceId, userId, role)`

Updates a member's role. The sole `owner` cannot be demoted.

```typescript
function updateMemberRole(workspaceId: string, userId: string, role: "member" | "admin" | "owner"): Promise<WorkspaceMember>
```

- `workspaceId` — Workspace.
- `userId` — Member to update.
- `role` — New role.

**Returns:** The updated membership.

#### `updateRole(req, res)`

Updates a member's role. Caller must be at least an admin.

```typescript
function updateRole(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `:id` (workspace) and `:userId` params and body `{ role }`.
- `res` — The response object.

#### `updateWorkspace(id, input)`

Updates a workspace's mutable fields.

```typescript
function updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<Workspace>
```

- `id` — Workspace id.
- `input` — Patch of name/slug.

**Returns:** The updated workspace.

### Constants

#### `acceptInviteSchema`

Schema for validating invite acceptance input.

```typescript
const acceptInviteSchema: z.ZodObject<{ token: z.ZodString; }, z.core.$strip>
```

#### `createWorkspaceSchema`

Schema for validating workspace creation input.

```typescript
const createWorkspaceSchema: z.ZodObject<{ name: z.ZodString; slug: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `inviteMemberSchema`

Schema for validating member invite input.

```typescript
const inviteMemberSchema: z.ZodObject<{ email: z.ZodString; role: z.ZodDefault<z.ZodEnum<{ member: "member"; admin: "admin"; owner: "owner"; }>>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for workspace routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly listAll: typeof listAll; readonly updateRole: typeof updateRole; readonly remove: typeof remove; readonly invite: typeof invite; readonly listInvites: typeof listInvites; readonly revoke: typeof revoke; readonly accept: typeof accept; }
```

#### `routes`

Routes for workspaces, members, and invites.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/workspaces"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/workspaces"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/workspaces/invites/accept"; readonly handler: "accept"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/workspaces/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/workspaces/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/workspaces/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/workspaces/:id/members"; readonly handler: "listAll"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/workspaces/:id/members/:userId"; readonly handler: "updateRole"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/workspaces/:id/members/:userId"; readonly handler: "remove"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/workspaces/:id/invites"; readonly handler: "invite"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/workspaces/:id/invites"; readonly handler: "listInvites"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/workspaces/:id/invites/:inviteId"; readonly handler: "revoke"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `updateMemberRoleSchema`

Schema for validating member role updates.

```typescript
const updateMemberRoleSchema: z.ZodObject<{ role: z.ZodEnum<{ member: "member"; admin: "admin"; owner: "owner"; }>; }, z.core.$strip>
```

#### `updateWorkspaceSchema`

Schema for validating workspace update input.

```typescript
const updateWorkspaceSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; slug: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `WORKSPACE_ROLES`

Allowed workspace member roles, ordered weakest → strongest.

```typescript
const WORKSPACE_ROLES: readonly ["member", "admin", "owner"]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0
