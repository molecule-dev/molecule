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
import { routes, requestHandlerMap, createVersion } from '@molecule/api-resource-version-history'

// Wire routes via mlcl inject:
//   POST   /:resourceType/:resourceId/versions
//   GET    /:resourceType/:resourceId/versions
//   GET    /:resourceType/:resourceId/versions/count
//   GET    /:resourceType/:resourceId/versions/:version
//   GET    /versions/:versionId
//   POST   /versions/:versionId/restore
//   GET    /versions/:fromVersionId/diff/:toVersionId

// Or call the service directly from another resource's update handler:
await createVersion({
  resourceType: 'document',
  resourceId: doc.id,
  userId: req.session.userId,
  snapshot: doc,
  reason: 'autosave',
})
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-version-history
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

### Functions

#### `create(req, res)`

Captures a new version of a resource.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` / `resourceId` params and a snapshot body.
- `res` — The response object.

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

```typescript
function diff(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `fromVersionId` and `toVersionId` params.
- `res` — The response object.

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

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `read(req, res)`

Reads a single version by ID.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `versionId` param.
- `res` — The response object.

#### `readByNumber(req, res)`

Reads a single version of a resource by 1-based version number.

```typescript
function readByNumber(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType`, `resourceId`, and `version` params.
- `res` — The response object.

#### `restore(req, res)`

Restores a prior version by appending a new version whose snapshot
matches it. Append-only — the existing rows are never mutated.

```typescript
function restore(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `versionId` param.
- `res` — The response object.

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

#### `versionCount(req, res)`

Returns the total number of versions for a resource.

```typescript
function versionCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

### Constants

#### `createVersionSchema`

Schema for validating create-version input.

```typescript
const createVersionSchema: z.ZodObject<{ snapshot: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>; reason: z.ZodNullable<z.ZodOptional<z.ZodString>>; }, z.core.$strip>
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

Routes for the version-history resource.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/:resourceType/:resourceId/versions"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/versions"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/versions/count"; readonly handler: "versionCount"; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/versions/:version"; readonly handler: "readByNumber"; }, { readonly method: "get"; readonly path: "/versions/:versionId"; readonly handler: "read"; }, { readonly method: "post"; readonly path: "/versions/:versionId/restore"; readonly handler: "restore"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/versions/:fromVersionId/diff/:toVersionId"; readonly handler: "diff"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-resource-version-history`.
