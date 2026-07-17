# @molecule/api-trash

Polymorphic soft-delete + restore + purge helper for any molecule resource.

Captures a snapshot of any resource at trash time, then either restores
it (re-creating the parent via a registered callback) or purges it. The
same package serves note-taking, document-collaboration, kanban,
project-management, wiki, and any other productivity app that needs an
undo-friendly delete experience.

## Quick Start

```typescript
import {
  trashItem,
  restoreFromTrash,
  registerRestoreCallback,
  routes,
  requestHandlerMap,
} from '@molecule/api-trash'

// 1. Soft-delete from a parent resource's `delete` handler:
await trashItem({
  resourceType: 'document',
  resourceId: doc.id,
  userId: (res.locals.session as { userId?: string } | undefined)?.userId,
  snapshot: doc,
  reason: 'user delete',
  ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
})

// 2. Register a restore callback at startup so the HTTP `restore`
//    route can re-create the parent resource:
registerRestoreCallback('document', async (snapshot) => {
  await documentService.upsertFromSnapshot(snapshot)
})

// 3. Wire routes via mlcl inject — surfaces:
//   POST   /:resourceType/:resourceId/trash
//   GET    /trash
//   GET    /trash/count
//   GET    /trash/:trashId
//   POST   /trash/:trashId/restore
//   POST   /trash/:trashId/purge
```

## Type
`feature`

## Installation
```bash
npm install @molecule/api-trash @molecule/api-database @molecule/api-i18n @molecule/api-locales-trash @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `ListTrashOptions`

Filter options for listing trashed items.

```typescript
interface ListTrashOptions extends PaginationOptions {
  /** Limit to a specific resource type. */
  resourceType?: string
  /** Limit to items trashed by a specific user. */
  userId?: string
  /**
   * Whether to include rows that have been restored or purged. Defaults to
   * `false` — only currently-trashed rows are returned.
   */
  includeInactive?: boolean
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

#### `RestoreResult`

Outcome of attempting to restore a trashed item.

```typescript
interface RestoreResult {
  /** The trash row after `restoredAt` has been stamped. */
  trashedItem: TrashedItem
  /** Whether the supplied callback ran without throwing. */
  callbackSucceeded: boolean
}
```

#### `TrashedItem`

A trashed (soft-deleted) item.

Soft-delete writes a row here capturing a snapshot of the original
resource. Restore appends a `restoredAt` timestamp and re-creates the
resource from the snapshot via the caller's restore callback. Purge
stamps `purgedAt` and is irrecoverable.

```typescript
interface TrashedItem {
  /** Unique trash row identifier. */
  id: string
  /** The type of resource that was trashed (e.g. `'document'`, `'project'`). */
  resourceType: string
  /** The original resource ID that was trashed. */
  resourceId: string
  /** The ID of the user who trashed the item, or `null` if system-generated. */
  userId: string | null
  /** Snapshot of the resource captured at the moment of trashing. */
  snapshot: JSONValue
  /** Optional human-readable reason (e.g. "user delete", "bulk cleanup"). */
  reason: string | null
  /** When the item was moved to trash (ISO 8601). */
  trashedAt: string
  /** Optional expiry timestamp; rows past this can be purged automatically. */
  expiresAt: string | null
  /** When the item was restored, or `null` if still in trash. */
  restoredAt: string | null
  /** ID of the user who restored the item, or `null`. */
  restoredBy: string | null
  /** When the item was permanently purged, or `null` if still recoverable. */
  purgedAt: string | null
}
```

#### `TrashItemInput`

Input for soft-deleting (trashing) a resource.

```typescript
interface TrashItemInput {
  /** The type of resource being trashed. */
  resourceType: string
  /** The ID of the resource being trashed. */
  resourceId: string
  /** Snapshot of the resource captured at trash time. */
  snapshot: JSONValue
  /** ID of the user trashing the item, or `null` for system-generated. */
  userId?: string | null
  /** Optional human-readable reason. */
  reason?: string | null
  /** Optional retention window in milliseconds; sets `expiresAt = now + ttl`. */
  ttlMs?: number | null
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

#### `RestoreCallback`

A user-supplied callback that re-creates the original resource from a
snapshot during {@link restoreFromTrash}.

The callback is responsible for whatever upsert logic the parent resource
needs (e.g. inserting via `@molecule/api-database`'s `create`, or calling
a domain-specific service). The trash service does not touch the parent
resource directly — it only manages the trash row's lifecycle.

```typescript
type RestoreCallback = (snapshot: JSONValue, trashedItem: TrashedItem) => Promise<void>
```

### Functions

#### `clearRestoreCallbacks()`

Clears all registered restore callbacks. Primarily useful in tests.

```typescript
function clearRestoreCallbacks(): void
```

#### `countTrashedItems(options)`

Returns the count of active trash rows matching the optional filters.

```typescript
function countTrashedItems(options?: Pick<ListTrashOptions, "resourceType" | "userId" | "includeInactive">): Promise<number>
```

- `options` — Filters (resourceType, userId).

**Returns:** The number of active trash rows matching the filters.

#### `deleteTrashForResource(resourceType, resourceId)`

Hard-deletes every trash row (active or otherwise) that belongs to a
resource. Intended for cleanup when the parent resource itself is
permanently removed and any audit trail is no longer required.

```typescript
function deleteTrashForResource(resourceType: string, resourceId: string): Promise<number>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.

**Returns:** The number of rows deleted.

#### `getActiveTrashedItem(resourceType, resourceId)`

Returns the most recent trash row for a resource, or `null` if there is
no active (un-restored, un-purged) entry.

```typescript
function getActiveTrashedItem(resourceType: string, resourceId: string): Promise<TrashedItem | null>
```

- `resourceType` — The resource type.
- `resourceId` — The resource ID.

**Returns:** The active trash row, or `null`.

#### `getRestoreCallback(resourceType)`

Returns the restore callback registered for a resource type, or
`undefined` if none has been registered.

```typescript
function getRestoreCallback(resourceType: string): RestoreCallback | undefined
```

- `resourceType` — The resource type to look up.

**Returns:** The callback, or `undefined`.

#### `getTrashedItemById(trashId)`

Looks up a trash row by its own ID. Returns rows regardless of restored
or purged state (callers needing only-active behavior should filter).

```typescript
function getTrashedItemById(trashId: string): Promise<TrashedItem | null>
```

- `trashId` — The trash row ID.

**Returns:** The trash row, or `null` if not found.

#### `isTrashAdmin(res)`

Resolves whether the current request's session belongs to an actor
authorized to administer trash (inspect/restore/purge any user's rows).
Fail-closed: returns `false` when there is no authenticated session, and
otherwise only `true` when the session carries an admin claim — `isAdmin ===
true`, `role === 'admin'`, `roles` containing `'admin'`, or `permissions`
containing `'admin'` / `'trash:manage'`.

```typescript
function isTrashAdmin(res: MoleculeResponse): boolean
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized trash admin.

#### `list(req, res)`

Lists paginated trash rows, defaulting to active-only and newest-first.

Owner-scoped: the owner is derived from `res.locals.session.userId` and any
client-supplied `req.query.userId` is IGNORED — trash rows capture snapshots
of deleted records, so an unscoped list keyed off a client `userId` would be
a one-request cross-tenant dump. Returns 401 when there is no authenticated
session. When the opt-in {@link trashAdmin} middleware has set
`res.locals.trashAdmin`, an admin may instead filter by any `req.query.userId`
(or omit it to inspect every user's rows).

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request, with optional `resourceType`, `limit`, `offset`,
- `res` — The response object (reads `locals.session`/`locals.trashAdmin`).

#### `listTrashedItems(options)`

Lists paginated trash rows, defaulting to active-only and newest-first.

```typescript
function listTrashedItems(options?: ListTrashOptions): Promise<PaginatedResult<TrashedItem>>
```

- `options` — Filter and pagination options.

**Returns:** A paginated result of trash rows.

#### `purge(req, res)`

Permanently purges a trash row by stamping `purgedAt`. Snapshot is
retained for audit purposes; use the programmatic `purgeItemHard()`
service method to remove the row entirely.

```typescript
function purge(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `trashId` param.
- `res` — The response object.

#### `purgeExpired(now)`

Soft-purges every active trash row whose `expiresAt` has passed.

```typescript
function purgeExpired(now?: Date): Promise<number>
```

- `now` — Optional override for the comparison timestamp (testing).

**Returns:** The number of rows stamped as purged.

#### `purgeItem(trashId)`

Permanently purges a single trash row by stamping `purgedAt`. The row
itself is retained for audit purposes; the snapshot is intentionally
left in place so external systems (e.g. compliance) can review it.

Use {@link purgeItemHard} to remove the row entirely.

```typescript
function purgeItem(trashId: string): Promise<TrashedItem | null>
```

- `trashId` — The trash row ID.

**Returns:** The updated trash row, or `null` if not found / already purged.

#### `purgeItemHard(trashId)`

Hard-deletes a trash row, including its snapshot. Irreversible.

```typescript
function purgeItemHard(trashId: string): Promise<boolean>
```

- `trashId` — The trash row ID.

**Returns:** `true` if a row was deleted.

#### `read(req, res)`

Reads a single trash row by ID.

Owner-scoped: returns 401 with no session, and 404 when the row is missing
OR owned by a different user — a non-owner cannot tell the two apart, so the
existence of another user's deleted-record snapshot is never leaked. When the
opt-in {@link trashAdmin} middleware has set `res.locals.trashAdmin`, an admin
may read any user's row.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `trashId` param.
- `res` — The response object (reads `locals.session`/`locals.trashAdmin`).

#### `registerRestoreCallback(resourceType, callback)`

Registers a restore callback for a resource type.

Subsequent calls with the same `resourceType` overwrite the previous
registration.

```typescript
function registerRestoreCallback(resourceType: string, callback: RestoreCallback): void
```

- `resourceType` — The resource type the callback handles.
- `callback` — The callback to invoke when restoring rows of this type.

#### `restore(req, res)`

Restores a trashed item by invoking the registered restore callback for
its resource type and stamping `restoredAt` on the trash row.

```typescript
function restore(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `trashId` param.
- `res` — The response object.

#### `restoreFromTrash(trashId, userId, callback)`

Restores a trashed item: stamps `restoredAt` on the trash row and invokes
the supplied callback to re-create the parent resource from the snapshot.

If the trash row is missing or already restored/purged, returns `null`.
If the callback throws, the trash row is left un-stamped (so the next
call can retry) and the error is re-thrown.

```typescript
function restoreFromTrash(trashId: string, userId: string | null, callback: RestoreCallback): Promise<RestoreResult | null>
```

- `trashId` — The trash row ID.
- `userId` — The user performing the restore, or `null` for system.
- `callback` — Caller-supplied restore logic that re-creates the parent.

**Returns:** A {@link RestoreResult}, or `null` if the row is missing/inactive.

#### `trash(req, res)`

Soft-deletes a resource by capturing a snapshot in the trash table.

```typescript
function trash(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` / `resourceId` params and a snapshot body.
- `res` — The response object.

#### `trashAdmin()`

Opt-in route middleware that *widens* an authenticated admin to cross-user
trash inspection by setting `res.locals.trashAdmin = true`. It never blocks:
a non-admin (or anonymous) caller passes through unchanged and remains
owner-scoped in the handlers, so composing this onto a route can only widen
for admins, never open the endpoint. Wire it onto a dedicated admin trash
route when a support/compliance console needs to see every user's rows.

```typescript
function trashAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `trashCount(req, res)`

Returns the count of active trash rows matching the optional filters.

Owner-scoped: the owner is derived from `res.locals.session.userId` and any
client-supplied `req.query.userId` is IGNORED, so a caller can only count
their own trash. Returns 401 when there is no authenticated session. When the
opt-in {@link trashAdmin} middleware has set `res.locals.trashAdmin`, an admin
may instead count by any `req.query.userId` (or omit it to count all users').

```typescript
function trashCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request, with optional `resourceType` and `includeInactive`
- `res` — The response object (reads `locals.session`/`locals.trashAdmin`).

#### `trashItem(input)`

Soft-deletes a resource by writing a snapshot row to the trash table.

```typescript
function trashItem(input: TrashItemInput): Promise<TrashedItem>
```

- `input` — Trashing input (resource identity, snapshot, optional ttl).

**Returns:** The newly-created trash row.

#### `unregisterRestoreCallback(resourceType)`

Removes any registered restore callback for the given resource type.

```typescript
function unregisterRestoreCallback(resourceType: string): boolean
```

- `resourceType` — The resource type whose callback should be removed.

**Returns:** `true` if a callback was removed.

### Constants

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map for trash routes.

```typescript
const requestHandlerMap: { readonly trash: typeof trash; readonly list: typeof list; readonly trashCount: typeof trashCount; readonly read: typeof read; readonly restore: typeof restore; readonly purge: typeof purge; }
```

#### `restoreFromTrashSchema`

Schema for validating restore input. Body is optional — the trash row to
restore is identified by URL params.

```typescript
const restoreFromTrashSchema: z.ZodObject<{ reason: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>; }, z.core.$strip>
```

#### `routes`

Routes for the trash helper. All routes require `authenticate`; the
handlers additionally scope every read/mutation to the caller's `userId`.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/:resourceType/:resourceId/trash"; readonly handler: "trash"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/trash"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/trash/count"; readonly handler: "trashCount"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/trash/:trashId"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/trash/:trashId/restore"; readonly handler: "restore"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/trash/:trashId/purge"; readonly handler: "purge"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `TRASH_ADMIN_PERMISSION`

Session-claim permission string (`'trash:manage'`) that, when present in a
session's `permissions` array, marks the caller as a trash admin.

```typescript
const TRASH_ADMIN_PERMISSION: "trash:manage"
```

#### `TRASH_PERMISSION_ACTION`

Permission action describing trash administration, e.g. for an app's own
`@molecule/api-permissions` wiring.

```typescript
const TRASH_PERMISSION_ACTION: "manage"
```

#### `TRASH_PERMISSION_RESOURCE`

Permission resource describing trash administration, e.g. for an app's own
`@molecule/api-permissions` wiring.

```typescript
const TRASH_PERMISSION_RESOURCE: "trash"
```

#### `trashItemSchema`

Schema for validating trash-item input (when soft-deleting via the HTTP
route). Routes pass `resourceType` and `resourceId` via URL params.

```typescript
const trashItemSchema: z.ZodObject<{ snapshot: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>; reason: z.ZodNullable<z.ZodOptional<z.ZodString>>; ttlMs: z.ZodNullable<z.ZodOptional<z.ZodNumber>>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-trash` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-trash`
- `@molecule/api-logger`
- `@molecule/api-resource`
- `zod`

- **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
  bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
  from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
  the rows come back; reading the response as a bare array — or `res.data` alone (which is
  the envelope) — yields an EMPTY list.
Session-auth prerequisite + owner-scoping: every route requires an
authenticated session and is owner-scoped IN-HANDLER — the caller is
re-derived from `res.locals.session.userId` (any client-supplied `userId`
is ignored), `list`/`count`/`read` return only the caller's rows, and
`restore`/`purge` act only on rows the caller owns. Legitimate cross-user
access (an admin trash console) is opt-in by composing the `trashAdmin`
middleware onto a route; without it there is no open endpoint. In your own
code, always take the user from the session (e.g. `getUserId(res)`), never
`req.body`.

The HTTP `restore` route is fail-closed on the callback registry: until
`registerRestoreCallback(resourceType, cb)` runs at startup, restoring that
resource type returns 501 — register a callback for EVERY resource type you
trash. (Programmatic callers can pass the callback directly to
`restoreFromTrash()`.) A row that was already restored or purged returns
409. Handler errors flow through `t()` with English defaults; install
`@molecule/api-locales-trash` for translations.

Tables: `src/__setup__/trashedItems.sql` creates `trashedItems`. An
mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
anywhere else run it once — nothing at runtime creates them.

## E2E Tests

Soft-delete lifecycle checklist — drive the real UI (live preview, no
mocks), adapt each item to this app's actual delete / Trash / restore
screens, and check every box off one by one. A box you can't check is a
bug to fix — not a skip:
- [ ] Soft-delete tombstones, it does not vanish: deleting an item in the
  UI removes it from the normal/active view (the parent's list, search, and
  any counts) yet it appears in the Trash view — the underlying trash row
  still exists with `trashedAt` set and `restoredAt`/`purgedAt` null.
  Confirm the same item is absent from active AND present in trash.
- [ ] Restore returns it verbatim: restoring from the Trash view re-creates
  the parent from its snapshot exactly as it was (same fields/content) and
  removes it from Trash (`restoredAt`/`restoredBy` get stamped, so the
  active-only trash list and count drop it). Restoring a row already
  restored or purged is refused (409), never silently duplicated.
- [ ] Purge / empty-trash is distinct from soft-delete and irreversible:
  permanently deleting a trashed item (or emptying trash) stamps `purgedAt`
  / removes the row — it leaves BOTH the active view and the Trash view, and
  a later restore is refused (409 already-resolved, or 404 once the row is
  hard-removed). Soft-delete stays recoverable; purge does not.
- [ ] Retention window (only if the app sets one): items trashed with a
  `ttlMs` get an `expiresAt`; once past it they become eligible for
  auto-purge (`purgeExpired`) and stop being restorable, matching the stated
  policy (e.g. "kept 30 days"). Skip only if the app defines no window.
- [ ] No deleted data leaks as active: a soft-deleted item never shows in
  normal listings, search results, or counts/badges — only in Trash. Verify
  the active count drops by exactly one on delete and the item is unfindable
  via search until it is restored.
- [ ] Authorization — each user sees and restores/purges only THEIR OWN
  trash: signed in as a second user, the Trash view shows none of the first
  user's items, and guessing another user's `trashId` into read / restore /
  purge returns 404 (existence is not leaked — not 403). The owner is taken
  from the session (any client-supplied `userId` is ignored), so a restored
  item returns to its original owner, never the caller.

## Translations

Translation strings are provided by `@molecule/api-locales-trash`.
