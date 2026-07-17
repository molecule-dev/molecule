# @molecule/api-resource-version-history

Append-only version history resource for molecule.dev.

Polymorphic, append-only `versions` table that captures full snapshots of
any resource type, plus a shallow diff against the prior version. Routes
surface list / read / count / diff / restore — there is no UPDATE or
DELETE for individual versions, by design. Restoring a prior version
appends a new version whose snapshot equals the target's; the existing
rows are never mutated.

## Quick Start

```typescript
import {
  routes,
  requestHandlerMap,
  createVersion,
  registerOwnershipResolver,
} from '@molecule/api-resource-version-history'

// REQUIRED before mounting the routes: tell version-history how to check
// parent-resource ownership for each resource type you version. Without this
// every read/list/diff/restore fails closed (404) — the routes are never open.
registerOwnershipResolver('document', async ({ resourceId, userId }) => {
  const doc = await findById('documents', resourceId)
  return doc?.userId === userId
})

// Wire routes via mlcl inject:
//   POST   /:resourceType/:resourceId/versions
//   GET    /:resourceType/:resourceId/versions
//   GET    /:resourceType/:resourceId/versions/count
//   GET    /:resourceType/:resourceId/versions/:version
//   GET    /versions/:versionId
//   POST   /versions/:versionId/restore
//   GET    /versions/:fromVersionId/diff/:toVersionId

// Or call the service directly from another resource's update handler.
// The acting user ALWAYS comes from the session (res.locals.session) —
// never from the request body:
const userId = (res.locals.session as { userId?: string } | undefined)?.userId
await createVersion({
  resourceType: 'document',
  resourceId: doc.id,
  userId: userId ?? null,
  snapshot: doc,
  reason: 'autosave',
})
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-version-history @molecule/api-database @molecule/api-i18n @molecule/api-locales-resource-version-history @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `CreateVersionInput`

Input for creating a new version.

```typescript
interface CreateVersionInput {
  /** The type of resource being versioned. */
  resourceType: string
  /** The ID of the resource being versioned. */
  resourceId: string
  /** Full snapshot of the resource. */
  snapshot: JSONValue
  /** ID of the user creating this version, or `null` for system-generated versions. */
  userId?: string | null
  /** Optional human-readable reason. */
  reason?: string | null
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

#### `PaginationOptions`

Options for paginated queries.

```typescript
interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}
```

#### `Version`

A point-in-time snapshot of a resource.

Versions are append-only. A new row is created each time the resource
changes; old rows are never mutated.

```typescript
interface Version {
  /** Unique version identifier. */
  id: string
  /** The type of resource this version belongs to (e.g. `'document'`, `'project'`). */
  resourceType: string
  /** The ID of the resource this version belongs to. */
  resourceId: string
  /** The monotonically-increasing version number for this resource (1-based). */
  version: number
  /** The ID of the user who created this version, or `null` if system-generated. */
  userId: string | null
  /** Full snapshot of the resource at this point in time. */
  snapshot: JSONValue
  /** Shallow diff against the previous version, or `null` if this is the first version. */
  changes: VersionChanges | null
  /** Optional human-readable reason for this version (e.g. commit message). */
  reason: string | null
  /** When this version was created (ISO 8601). */
  createdAt: string
}
```

#### `VersionDiff`

Result of comparing two versions of the same resource.

```typescript
interface VersionDiff {
  /** The earlier version. */
  from: Version
  /** The later version. */
  to: Version
  /** Per-field changes between `from.snapshot` and `to.snapshot`. */
  changes: VersionChanges
}
```

#### `VersionFieldChange`

Per-field change record for a single key. `before` is the previous value,
`after` is the new value. Either may be `undefined` for added/removed fields.

```typescript
interface VersionFieldChange {
  /** Previous value (`undefined` if the field was added). */
  before?: JSONValue
  /** New value (`undefined` if the field was removed). */
  after?: JSONValue
}
```

#### `VersionOwnershipContext`

The context an ownership resolver receives to decide access. `userId` is the
authenticated caller (re-derived from `res.locals.session.userId`, never
client-supplied).

```typescript
interface VersionOwnershipContext {
  /** The parent resource type (e.g. `'document'`, `'project'`). */
  resourceType: string
  /** The parent resource id whose versions are being accessed. */
  resourceId: string
  /** The authenticated caller's user id. */
  userId: string
}
```

### Types

#### `JSONValue`

A JSON-serializable snapshot value. Constrained by what the underlying
`JSONB` column can accept.

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }
```

#### `VersionChanges`

Shallow per-field diff between two snapshots, keyed by field name.

```typescript
type VersionChanges = Record<string, VersionFieldChange>
```

#### `VersionOwnershipResolver`

Resolves whether the authenticated caller may read/restore versions of a
given parent resource. Return `true` to allow, `false` to deny. May be
async (e.g. it can look the parent resource up in the database).

```typescript
type VersionOwnershipResolver = (
  context: VersionOwnershipContext,
) => boolean | Promise<boolean>
```

### Functions

#### `clearOwnershipResolvers()`

Clears all registered ownership resolvers. Primarily useful in tests.

```typescript
function clearOwnershipResolvers(): void
```

#### `create(req, res)`

Captures a new version of a resource.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when the caller is not authorized for the parent resource — a caller can only
capture versions of a resource they own, never inject snapshots into another
tenant's resource.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` / `resourceId` params and a snapshot body.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `createVersion(input)`

Captures a new version of a resource.

Reads the latest existing version for `(resourceType, resourceId)` to
compute the next version number and the shallow diff against the prior
snapshot. The resulting row is append-only.

```typescript
function createVersion(input: CreateVersionInput): Promise<Version>
```

- `input` — The version creation input.

**Returns:** The created version.

#### `deleteVersionsForResource(resourceType, resourceId)`

Deletes every version for a resource. Intended for cleanup when the parent
resource itself is deleted; never call from user-facing handlers without
authorization checks.

```typescript
function deleteVersionsForResource(resourceType: string, resourceId: string): Promise<number>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.

**Returns:** The number of versions deleted.

#### `diff(req, res)`

Returns the shallow diff between two versions of the same resource.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when either version is missing OR the caller is not authorized for the parent
resource the two versions share. An opt-in {@link versionHistoryAdmin} may
diff any versions.

```typescript
function diff(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `fromVersionId` and `toVersionId` params.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `diffSnapshots(before, after)`

Computes a shallow per-field diff between two JSON snapshots.

For object snapshots, every key present in either snapshot is examined;
keys whose values differ (by deep equality) are included in the result.
For non-object snapshots, the entire value is reported under the
synthetic key `$value`.

```typescript
function diffSnapshots(before: JSONValue, after: JSONValue): VersionChanges
```

- `before` — The previous snapshot, or `null` if this is the first version.
- `after` — The new snapshot.

**Returns:** A {@link VersionChanges} record. Empty when the snapshots are equal.

#### `diffVersions(fromVersionId, toVersionId)`

Compares two versions and returns the shallow diff between their snapshots.

The argument order does not matter — the lower-numbered version is always
treated as `from`, the higher-numbered as `to`, so `changes` describes the
forward delta.

```typescript
function diffVersions(fromVersionId: string, toVersionId: string): Promise<VersionDiff | null>
```

- `fromVersionId` — One version ID to compare.
- `toVersionId` — The other version ID to compare.

**Returns:** The {@link VersionDiff}, or `null` if either version is missing or
 *          the two versions belong to different resources.

#### `getLatestVersion(resourceType, resourceId)`

Returns the most recent version for a resource, or `null` if no versions exist.

```typescript
function getLatestVersion(resourceType: string, resourceId: string): Promise<Version | null>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.

**Returns:** The latest version, or `null`.

#### `getOwnershipResolver(resourceType)`

Returns the ownership resolver registered for a resource type, or
`undefined` if none has been registered.

```typescript
function getOwnershipResolver(resourceType: string): VersionOwnershipResolver | undefined
```

- `resourceType` — The resource type to look up.

**Returns:** The resolver, or `undefined`.

#### `getVersionById(versionId)`

Retrieves a version by ID.

```typescript
function getVersionById(versionId: string): Promise<Version | null>
```

- `versionId` — The version ID.

**Returns:** The version, or `null` if not found.

#### `getVersionByNumber(resourceType, resourceId, version)`

Retrieves a version by resource and version number.

```typescript
function getVersionByNumber(resourceType: string, resourceId: string, version: number): Promise<Version | null>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.
- `version` — The 1-based version number.

**Returns:** The version, or `null` if not found.

#### `getVersionCount(resourceType, resourceId)`

Returns the total number of versions for a resource.

```typescript
function getVersionCount(resourceType: string, resourceId: string): Promise<number>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.

**Returns:** The version count.

#### `getVersionsForResource(resourceType, resourceId, options)`

Retrieves paginated versions for a resource, ordered by version number descending.

```typescript
function getVersionsForResource(resourceType: string, resourceId: string, options?: PaginationOptions): Promise<PaginatedResult<Version>>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.
- `options` — Pagination options.

**Returns:** A paginated result of versions.

#### `isVersionAuthorized(res, context)`

Authorizes whether the authenticated caller may access versions of a parent
resource. Admins widened by {@link versionHistoryAdmin} are always allowed;
otherwise the app-registered {@link VersionOwnershipResolver} for the parent
`resourceType` decides. **Fail-closed:** when no resolver is registered the
caller is denied, so the polymorphic version store never leaks a snapshot it
cannot prove the caller owns.

```typescript
function isVersionAuthorized(res: MoleculeResponse, context: VersionOwnershipContext): Promise<boolean>
```

- `res` — The response whose `locals.session`/`locals.versionHistoryAdmin`
- `context` — The {@link VersionOwnershipContext} (parent resource + caller).

**Returns:** `true` when the caller may access the parent resource's versions.

#### `isVersionHistoryAdmin(res)`

Resolves whether the current request's session belongs to an actor
authorized to administer version history (read/restore any user's versions).
Fail-closed: returns `false` when there is no authenticated session, and
otherwise only `true` when the session carries an admin claim — `isAdmin ===
true`, `role === 'admin'`, `roles` containing `'admin'`, or `permissions`
containing `'admin'` / `'versionHistory:manage'`.

```typescript
function isVersionHistoryAdmin(res: MoleculeResponse): boolean
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized version-history admin.

#### `jsonEqual(a, b)`

Returns `true` if `a` and `b` are deeply equal as JSON values.

```typescript
function jsonEqual(a: JSONValue | undefined, b: JSONValue | undefined): boolean
```

- `a` — First value to compare.
- `b` — Second value to compare.

**Returns:** Whether the two values are structurally equal.

#### `list(req, res)`

Lists paginated versions for a resource, newest version first.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when the caller is not authorized for the parent resource — only the parent
resource's owner (or an opt-in {@link versionHistoryAdmin}) sees its versions.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `read(req, res)`

Reads a single version by ID.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when the version is missing OR the caller is not authorized for its parent
resource — a non-owner cannot tell the two apart, so another tenant's
snapshot is never disclosed. An opt-in {@link versionHistoryAdmin} may read
any version.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `versionId` param.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `readByNumber(req, res)`

Reads a single version of a resource by 1-based version number.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when the caller is not authorized for the parent resource.

```typescript
function readByNumber(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType`, `resourceId`, and `version` params.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `registerOwnershipResolver(resourceType, resolver)`

Registers an ownership resolver for a parent resource type.

Subsequent calls with the same `resourceType` overwrite the previous
registration.

```typescript
function registerOwnershipResolver(resourceType: string, resolver: VersionOwnershipResolver): void
```

- `resourceType` — The parent resource type the resolver authorizes.
- `resolver` — The resolver to invoke when authorizing access to versions

#### `restore(req, res)`

Restores a prior version by appending a new version whose snapshot
matches it. Append-only — the existing rows are never mutated.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when the version is missing OR the caller is not authorized for its parent
resource — a non-owner can neither restore another tenant's version nor learn
that it exists. An opt-in {@link versionHistoryAdmin} may restore any version.

```typescript
function restore(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `versionId` param.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `restoreVersion(versionId, userId, reason)`

Restores a prior version by appending a new version whose snapshot matches it.

Append-only: the existing rows are never mutated. The newly-appended
version has its own monotonically-increasing `version` number, and its
`reason` defaults to `Restored from version <n>` when no reason is supplied.

```typescript
function restoreVersion(versionId: string, userId: string | null, reason?: string | null): Promise<Version | null>
```

- `versionId` — The version ID to restore.
- `userId` — The user performing the restore, or `null` for system.
- `reason` — Optional human-readable reason. When omitted, a default

**Returns:** The newly-appended version, or `null` if `versionId` was not found.

#### `unregisterOwnershipResolver(resourceType)`

Removes any registered ownership resolver for the given resource type.

```typescript
function unregisterOwnershipResolver(resourceType: string): boolean
```

- `resourceType` — The resource type whose resolver should be removed.

**Returns:** `true` if a resolver was removed.

#### `versionCount(req, res)`

Returns the total number of versions for a resource.

Secure by default: returns 401 with no session, and 404 (no existence leak)
when the caller is not authorized for the parent resource.

```typescript
function versionCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object (reads `locals.session`/`locals.versionHistoryAdmin`).

#### `versionHistoryAdmin()`

Opt-in route middleware that *widens* an authenticated admin to cross-tenant
version access by setting `res.locals.versionHistoryAdmin = true`. It never
blocks: a non-admin (or anonymous) caller passes through unchanged and
remains subject to the ownership resolver in the handlers, so composing this
onto a route can only widen for admins, never open the endpoint. Wire it onto
a dedicated admin route when a support/compliance console needs to read or
restore every user's versions.

```typescript
function versionHistoryAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

### Constants

#### `createVersionSchema`

Schema for validating create-version input.

```typescript
const createVersionSchema: z.ZodObject<{ snapshot: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>; reason: z.ZodNullable<z.ZodOptional<z.ZodString>>; }, z.core.$strip>
```

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map for version-history routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly versionCount: typeof versionCount; readonly readByNumber: typeof readByNumber; readonly read: typeof read; readonly restore: typeof restore; readonly diff: typeof diff; }
```

#### `restoreVersionSchema`

Schema for validating restore-version input. Body is empty — the version
to restore is identified by URL params.

```typescript
const restoreVersionSchema: z.ZodObject<{ reason: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>; }, z.core.$strip>
```

#### `routes`

Routes for the version-history resource. All routes require `authenticate`;
the handlers additionally authorize every read/mutation against the caller's
ownership of the parent resource.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/:resourceType/:resourceId/versions"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/versions"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/versions/count"; readonly handler: "versionCount"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/versions/:version"; readonly handler: "readByNumber"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/versions/:versionId"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/versions/:versionId/restore"; readonly handler: "restore"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/versions/:fromVersionId/diff/:toVersionId"; readonly handler: "diff"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `VERSION_HISTORY_ADMIN_PERMISSION`

Session-claim permission string (`'versionHistory:manage'`) that, when
present in a session's `permissions` array, marks the caller as a
version-history admin.

```typescript
const VERSION_HISTORY_ADMIN_PERMISSION: "versionHistory:manage"
```

#### `VERSION_HISTORY_PERMISSION_ACTION`

Permission action describing version-history administration, e.g. for an
app's own `@molecule/api-permissions` wiring.

```typescript
const VERSION_HISTORY_PERMISSION_ACTION: "manage"
```

#### `VERSION_HISTORY_PERMISSION_RESOURCE`

Permission resource describing version-history administration, e.g. for an
app's own `@molecule/api-permissions` wiring.

```typescript
const VERSION_HISTORY_PERMISSION_RESOURCE: "versionHistory"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource-version-history` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-resource-version-history`
- `@molecule/api-logger`
- `@molecule/api-resource`
- `zod`

- **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
  bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
  from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
  the rows come back; reading the response as a bare array — or `res.data` alone (which is
  the envelope) — yields an EMPTY list.
**Security — the raw routes are NOT open.** Snapshots can contain any
tenant's data, so every route requires an authenticated session AND each
handler re-derives the caller from `res.locals.session.userId` and authorizes
access to the *parent* resource via {@link isVersionAuthorized}. Access is
**fail-closed and pluggable**: because the store is polymorphic it cannot
know who owns an arbitrary `(resourceType, resourceId)`, so an app mounting
these routes MUST register a {@link VersionOwnershipResolver} per resource
type at startup via {@link registerOwnershipResolver} — until it does, every
read/list/diff/restore returns 404 (no existence leak) rather than exposing
another tenant's snapshots. Cross-tenant admin access is opt-in via the
{@link versionHistoryAdmin} middleware. Do NOT mount the raw routes without
either a registered resolver or your own resource-ownership gate.

Tables: `src/__setup__/versions.sql` creates `versions`. An mlcl-scaffolded
API replays `__setup__/*.sql` automatically on migrate; anywhere else run it
once — nothing at runtime creates them. Handler errors flow through `t()`
with English defaults; install `@molecule/api-locales-resource-version-history`
and register it with `registerLocaleModule` for translations.

## E2E Tests

Versioning-correctness checklist — drive the real UI (live preview, no mocks)
wherever this app surfaces revisions/history, adapt each item to the actual
screens, and check every box. A box you can't check is a versioning bug to
fix — not a skip. The point is to PROVE versions are recorded, ordered,
diffable, restorable, and tamper-evident, not just that CRUD compiles:
- [ ] Editing a versioned resource RECORDS a new version: after a save the
  history count grows by exactly one, the prior version is RETAINED (its
  snapshot unchanged — not overwritten), and the new row carries the next
  1-based `version` number (previous + 1), the acting user as `userId`
  (author), and a fresh `createdAt`. The very first save has `changes: null`;
  later saves record a `changes` shallow diff (before/after per field)
  against the prior snapshot.
- [ ] Listing history returns versions newest-first (by `version` descending)
  with `total` reflecting every version, each row showing its number, author
  (`userId`), `reason`, and `createdAt` — and the count only ever GROWS across
  saves (append-only: no save shrinks or rewrites history).
- [ ] Viewing an old version shows that version's full `snapshot`; diffing two
  versions renders the per-field `changes` as a forward delta (the
  lower-numbered version is `from`, the higher is `to`), and a diff across two
  different resources is rejected (no cross-resource diff).
- [ ] Reverting/restoring an old version makes it current AND itself APPENDS a
  new version whose snapshot equals the target's — the prior current version
  and the restored-from version both still exist afterward, the new version's
  number is the next in sequence, its author is the acting user, and its
  `reason` records the restore (default `Restored from version <n>`). History
  is never lost by a revert.
- [ ] Retention is append-only and unbounded — nothing prunes: there is no UI
  or endpoint to edit or delete an individual version (no UPDATE/DELETE
  route), so a resource's history count never decreases. (If the app layers
  its own retention policy on top, verify it prunes oldest-first per that
  policy and never drops the current version.)
- [ ] AUTHORIZATION — a resource's version history is reachable only by a user
  who can access that resource: a different user id-guessing the
  `(resourceType, resourceId)` or a `versionId` gets 404 (no existence leak),
  never another tenant's history, and with no ownership resolver registered
  every read/list/diff/restore fails closed. The version author is always the
  session user (`res.locals.session.userId`), never a body-supplied id — a
  caller cannot attribute a change to someone else. A user cannot fabricate or
  delete history to hide a change: versions are append-only and a revert
  appends rather than rewrites; only the opt-in `versionHistoryAdmin`
  middleware crosses tenants.

## Translations

Translation strings are provided by `@molecule/api-locales-resource-version-history`.
