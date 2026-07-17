# @molecule/api-resource-comment

Threaded comments resource for molecule.dev.

Polymorphic comments that attach to any resource type. Supports threaded
replies, pagination, and ownership-based authorization.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-comment'

// Wire routes into your Express app via mlcl inject
// POST   /:resourceType/:resourceId/comments
// GET    /:resourceType/:resourceId/comments
// GET    /comments/:commentId
// PUT    /comments/:commentId
// DELETE /comments/:commentId
// GET    /comments/:commentId/replies
// GET    /:resourceType/:resourceId/comments/count — cheap badge counts
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-comment @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `Comment`

A comment attached to a resource, with optional threading via `parentId`.

```typescript
interface Comment {
  /** Unique comment identifier. */
  id: string
  /** The type of resource this comment is attached to (e.g. 'project', 'post'). */
  resourceType: string
  /** The ID of the resource this comment is attached to. */
  resourceId: string
  /** The ID of the user who created this comment. */
  userId: string
  /** The parent comment ID for threaded replies, or `null` for top-level comments. */
  parentId: string | null
  /** The comment body text. */
  body: string
  /** When the comment was last edited, or `null` if never edited. */
  editedAt: string | null
  /** When the comment was created (ISO 8601). */
  createdAt: string
  /** When the comment was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `CreateCommentInput`

Input for creating a new comment.

```typescript
interface CreateCommentInput {
  /** The comment body text. */
  body: string
  /** Optional parent comment ID for threaded replies. */
  parentId?: string
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

#### `UpdateCommentInput`

Input for updating an existing comment.

```typescript
interface UpdateCommentInput {
  /** The updated comment body text. */
  body: string
}
```

### Functions

#### `commentCount(req, res)`

Returns the total comment count for a resource.

```typescript
function commentCount(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `create(req, res)`

Creates a new comment on a resource.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params and comment body.
- `res` — The response object.

#### `createComment(resourceType, resourceId, userId, data)`

Creates a new comment on a resource.

```typescript
function createComment(resourceType: string, resourceId: string, userId: string, data: CreateCommentInput): Promise<Comment>
```

- `resourceType` — The type of resource being commented on.
- `resourceId` — The ID of the resource being commented on.
- `userId` — The ID of the commenting user.
- `data` — The comment creation input.

**Returns:** The created comment.

#### `del(req, res)`

Deletes a comment. Only the comment owner can delete.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `commentId` param.
- `res` — The response object.

#### `deleteComment(commentId, userId)`

Deletes a comment. Only the comment owner can delete.

```typescript
function deleteComment(commentId: string, userId: string): Promise<boolean>
```

- `commentId` — The comment ID to delete.
- `userId` — The requesting user's ID (must match comment owner).

**Returns:** `true` if deleted, `false` if not found or unauthorized.

#### `getCommentById(commentId)`

Retrieves a single comment by ID.

```typescript
function getCommentById(commentId: string): Promise<Comment | null>
```

- `commentId` — The comment ID to look up.

**Returns:** The comment or `null` if not found.

#### `getCommentCount(resourceType, resourceId)`

Returns the total number of comments on a resource (including replies).

```typescript
function getCommentCount(resourceType: string, resourceId: string): Promise<number>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.

**Returns:** The total comment count.

#### `getCommentsByResource(resourceType, resourceId, options)`

Retrieves paginated comments for a resource, ordered by creation date descending.
Only returns top-level comments (no replies).

```typescript
function getCommentsByResource(resourceType: string, resourceId: string, options?: PaginationOptions): Promise<PaginatedResult<Comment>>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.
- `options` — Pagination options.

**Returns:** A paginated result of comments.

#### `getReplies(commentId, options)`

Retrieves paginated replies to a comment, ordered by creation date ascending.

```typescript
function getReplies(commentId: string, options?: PaginationOptions): Promise<PaginatedResult<Comment>>
```

- `commentId` — The parent comment ID.
- `options` — Pagination options.

**Returns:** A paginated result of reply comments.

#### `list(req, res)`

Lists paginated top-level comments for a resource.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `read(req, res)`

Retrieves a single comment by ID.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `commentId` param.
- `res` — The response object.

#### `replies(req, res)`

Lists paginated replies to a comment.

```typescript
function replies(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `commentId` param.
- `res` — The response object.

#### `update(req, res)`

Updates an existing comment. Only the comment owner can update.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `commentId` param and update body.
- `res` — The response object.

#### `updateComment(commentId, userId, data)`

Updates a comment. Only the comment owner can update.

```typescript
function updateComment(commentId: string, userId: string, data: UpdateCommentInput): Promise<Comment | null>
```

- `commentId` — The comment ID to update.
- `userId` — The requesting user's ID (must match comment owner).
- `data` — The update input.

**Returns:** The updated comment or `null` if not found or unauthorized.

### Constants

#### `createCommentSchema`

Schema for validating comment creation input.

```typescript
const createCommentSchema: z.ZodObject<{ body: z.ZodString; parentId: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for comment routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly commentCount: typeof commentCount; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly replies: typeof replies; }
```

#### `routes`

Routes for comment CRUD and threaded replies.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/:resourceType/:resourceId/comments"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/comments"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/comments/count"; readonly handler: "commentCount"; }, { readonly method: "get"; readonly path: "/comments/:commentId"; readonly handler: "read"; }, { readonly method: "put"; readonly path: "/comments/:commentId"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/comments/:commentId"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/comments/:commentId/replies"; readonly handler: "replies"; }]
```

#### `updateCommentSchema`

Schema for validating comment update input.

```typescript
const updateCommentSchema: z.ZodObject<{ body: z.ZodString; }, z.core.$strip>
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
- **Migration required.** `src/__setup__/comments.sql` ships with this package
  and must exist in the target database before use (scaffolded apps apply it
  automatically; existing apps must apply it first).
- **Reads are PUBLIC by default.** `list`, `read`, `replies`, and `count` ship
  with no auth middleware (comment threads on public content). If the
  commented resources are private in your app, add an authorizer that checks
  access to the PARENT resource before serving its comments.
- **The author is always the session user.** Create/update/delete require
  `authenticate`; the create handler ignores any client-supplied author id,
  and update/delete verify ownership in the handler — keep those properties
  in any custom path.
- **The parent is polymorphic and unverified** (no FK on
  `resourceType`/`resourceId`): validate that the target exists in your domain
  code if orphaned threads matter, and reuse the same canonical type slugs as
  your other polymorphic resources (bookmarks, activity feed).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Posting a comment on a commentable resource shows it in the thread
  immediately and it persists across a full reload.
- [ ] Replying to a comment renders the reply nested under its parent.
- [ ] The author can edit their own comment and the updated text persists;
  a DIFFERENT signed-in user gets no edit/delete controls on it and a
  direct attempt is denied.
- [ ] Deleting an own comment removes it per the app's policy (gone or
  tombstone) and stays removed after reload.
- [ ] A long thread paginates ("load more" fetches older comments) without
  duplicating or dropping entries.
- [ ] A resource with no comments shows a readable empty state.
