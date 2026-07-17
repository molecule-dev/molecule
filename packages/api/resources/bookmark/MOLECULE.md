# @molecule/api-resource-bookmark

Bookmark/favorite resource for molecule.dev.

Allows users to bookmark any resource, organize into folders, and check
bookmark status.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-bookmark'

// Wire routes into your Express app via mlcl inject
// POST   /bookmarks
// GET    /bookmarks
// GET    /bookmarks/folders
// GET    /bookmarks/check/:resourceType/:resourceId
// DELETE /bookmarks/:resourceType/:resourceId
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-bookmark @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `Bookmark`

A bookmark linking a user to a resource, with optional folder grouping.

```typescript
interface Bookmark {
  /** Unique bookmark identifier. */
  id: string
  /** The ID of the user who created the bookmark. */
  userId: string
  /** The type of resource bookmarked (e.g. 'post', 'project'). */
  resourceType: string
  /** The ID of the bookmarked resource. */
  resourceId: string
  /** Optional folder name for organizing bookmarks. */
  folder: string | null
  /** When the bookmark was created (ISO 8601). */
  createdAt: string
  /** When the bookmark was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `BookmarkQuery`

Query options for listing bookmarks.

```typescript
interface BookmarkQuery {
  /** Filter by resource type. */
  resourceType?: string
  /** Filter by folder name. */
  folder?: string
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
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

### Functions

#### `addBookmark(userId, resourceType, resourceId, folder)`

Adds a bookmark. Idempotent — returns existing bookmark if already bookmarked.

```typescript
function addBookmark(userId: string, resourceType: string, resourceId: string, folder?: string): Promise<Bookmark>
```

- `userId` — The user ID.
- `resourceType` — The type of resource to bookmark.
- `resourceId` — The ID of the resource to bookmark.
- `folder` — Optional folder name.

**Returns:** The created or existing bookmark.

#### `check(req, res)`

Checks whether the current user has bookmarked a resource.

```typescript
function check(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `create(req, res)`

Adds a bookmark for the current user. Idempotent.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with bookmark body (resourceType, resourceId, folder?).
- `res` — The response object.

#### `del(req, res)`

Removes a bookmark by resource type and ID.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `folders(_req, res)`

Lists all unique folder names for the current user's bookmarks.

```typescript
function folders(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request (unused).
- `res` — The response object.

#### `getBookmarks(userId, options)`

Gets all bookmarks for a user with optional filtering and pagination.

```typescript
function getBookmarks(userId: string, options?: BookmarkQuery): Promise<PaginatedResult<Bookmark>>
```

- `userId` — The user ID.
- `options` — Query options.

**Returns:** Paginated bookmarks.

#### `getFolders(userId)`

Gets all unique folder names for a user's bookmarks.

```typescript
function getFolders(userId: string): Promise<string[]>
```

- `userId` — The user ID.

**Returns:** Array of folder names.

#### `isBookmarked(userId, resourceType, resourceId)`

Checks if a resource is bookmarked by a user.

```typescript
function isBookmarked(userId: string, resourceType: string, resourceId: string): Promise<boolean>
```

- `userId` — The user ID.
- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.

**Returns:** `true` if bookmarked.

#### `list(req, res)`

Lists the current user's bookmarks with optional filtering and pagination.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional query params (resourceType, folder, limit, offset).
- `res` — The response object.

#### `removeBookmark(userId, resourceType, resourceId)`

Removes a bookmark.

```typescript
function removeBookmark(userId: string, resourceType: string, resourceId: string): Promise<void>
```

- `userId` — The user ID.
- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.

### Constants

#### `createBookmarkSchema`

Schema for validating bookmark creation input.

```typescript
const createBookmarkSchema: z.ZodObject<{ resourceType: z.ZodString; resourceId: z.ZodString; folder: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for bookmark routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly check: typeof check; readonly folders: typeof folders; readonly del: typeof del; }
```

#### `routes`

Routes for bookmark add/remove/list/check and folder listing.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/bookmarks"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/bookmarks"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/bookmarks/folders"; readonly handler: "folders"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/bookmarks/check/:resourceType/:resourceId"; readonly handler: "check"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/bookmarks/:resourceType/:resourceId"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }]
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

- **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
  bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
  from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
  the rows come back; reading the response as a bare array — or `res.data` alone (which is
  the envelope) — yields an EMPTY list.
- **Migration required.** `src/__setup__/bookmarks.sql` ships with this package
  and must exist in the target database before use (scaffolded apps apply it
  automatically). Note the `UNIQUE ("userId","resourceType","resourceId")`
  constraint — one bookmark per user per resource.
- **`addBookmark()` is idempotent and does NOT move folders.** Re-adding an
  existing bookmark returns the existing row unchanged — to move a bookmark to
  another folder, remove and re-add it (or add your own update path).
- **Owner-scoped via the session.** All routes require `authenticate` and every
  query filters by the session `userId` — never accept a target userId from the
  client (IDOR).
- Bookmarked resources are polymorphic and unverified (no FK): use the same
  canonical `resourceType` slugs as your other polymorphic resources
  (comments, activity feed) so `check`/`remove` keys line up.
- Folders are free-form strings on the bookmark row (`GET /bookmarks/folders`
  returns the distinct set) — there is no folder entity to create first.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Bookmarking an item (POST /bookmarks with its resourceType +
  resourceId) saves it, it then appears in the user's bookmarks list
  (GET /bookmarks), and its bookmark/star control reflects the saved state
  (GET /bookmarks/check/:resourceType/:resourceId returns { bookmarked: true }).
- [ ] It is idempotent and toggles cleanly: bookmarking the SAME
  resourceType+resourceId twice does NOT create a duplicate (the UNIQUE
  (userId, resourceType, resourceId) constraint holds — the second add
  returns the existing row), and un-bookmarking
  (DELETE /bookmarks/:resourceType/:resourceId) removes it from the list and
  flips the control back (check returns { bookmarked: false }).
- [ ] Folders work: a bookmark filed into a folder (the free-form `folder`
  string, set at create time — re-adding does NOT move it between folders)
  shows under that folder, GET /bookmarks/folders returns the distinct folder
  set, and GET /bookmarks?folder=X (and ?resourceType=X) filters the list to
  only the matching bookmarks.
- [ ] Display data resolves from the referenced resource: the bookmark row
  stores only resourceType+resourceId (no title/url/thumbnail, no FK), so each
  list item renders its real title/thumbnail by looking the target up, and a
  bookmark whose target was since deleted is handled gracefully (hidden or
  tombstoned, never a crash or a blank row).
- [ ] Authorization — bookmarks are strictly per-user: the owner is the
  session userId (res.locals.session), NEVER a userId taken from the request
  body; every list/check/remove is scoped to that session user, so one user
  can neither see nor delete another user's saved items (there is no
  bookmark-id route to guess — keys are resourceType+resourceId under the
  caller's own userId); and a user can only bookmark targets they are allowed
  to see (the target is polymorphic and unverified, so gate the create by
  target visibility).
