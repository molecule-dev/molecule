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
npm install @molecule/api-resource-bookmark
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
