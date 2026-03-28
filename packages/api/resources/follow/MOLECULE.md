# @molecule/api-resource-follow

Follow/unfollow resource for molecule.dev.

Polymorphic follow system for users or any resource type. Supports
followers list, following list, and follow status checks.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-follow
```

## Usage

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-follow'

// Wire routes into your Express app via mlcl inject
// POST   /follow/:targetType/:targetId
// DELETE /follow/:targetType/:targetId
// GET    /:targetType/:targetId/followers
// GET    /following
// GET    /follow/check/:targetType/:targetId
```

## API

### Interfaces

#### `Follow`

A follow relationship between a user and a target resource.

```typescript
interface Follow {
  /** Unique follow identifier. */
  id: string
  /** The ID of the user who is following. */
  followerId: string
  /** The type of target being followed (e.g. 'user', 'project'). */
  targetType: string
  /** The ID of the target being followed. */
  targetId: string
  /** When the follow was created (ISO 8601). */
  createdAt: string
  /** When the follow was last updated (ISO 8601). */
  updatedAt: string
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

### Functions

#### `checkFollowing(req, res)`

Checks if the current user is following a target.

```typescript
function checkFollowing(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `targetType` and `targetId` params.
- `res` — The response object.

#### `create(req, res)`

Creates a follow relationship. Idempotent.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `targetType` and `targetId` params.
- `res` — The response object.

#### `del(req, res)`

Removes a follow relationship.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `targetType` and `targetId` params.
- `res` — The response object.

#### `follow(followerId, targetType, targetId)`

Creates a follow relationship. Idempotent — returns existing follow if already following.

```typescript
function follow(followerId: string, targetType: string, targetId: string): Promise<Follow>
```

- `followerId` — The ID of the follower.
- `targetType` — The type of target being followed.
- `targetId` — The ID of the target being followed.

**Returns:** The created or existing follow.

#### `following(req, res)`

Lists targets the current user is following.

```typescript
function following(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with pagination query params.
- `res` — The response object.

#### `getFollowerCount(targetType, targetId)`

Gets the follower count for a target.

```typescript
function getFollowerCount(targetType: string, targetId: string): Promise<number>
```

- `targetType` — The type of target.
- `targetId` — The ID of the target.

**Returns:** The number of followers.

#### `getFollowers(targetType, targetId, options)`

Gets paginated followers of a target.

```typescript
function getFollowers(targetType: string, targetId: string, options?: PaginationOptions): Promise<PaginatedResult<Follow>>
```

- `targetType` — The type of target.
- `targetId` — The ID of the target.
- `options` — Pagination options.

**Returns:** Paginated followers.

#### `getFollowing(userId, options)`

Gets paginated targets a user is following.

```typescript
function getFollowing(userId: string, options?: PaginationOptions): Promise<PaginatedResult<Follow>>
```

- `userId` — The follower's user ID.
- `options` — Pagination options.

**Returns:** Paginated follows.

#### `getFollowingCount(userId)`

Gets the following count for a user.

```typescript
function getFollowingCount(userId: string): Promise<number>
```

- `userId` — The user ID.

**Returns:** The number of targets the user is following.

#### `isFollowing(followerId, targetType, targetId)`

Checks if a user is following a target.

```typescript
function isFollowing(followerId: string, targetType: string, targetId: string): Promise<boolean>
```

- `followerId` — The follower's user ID.
- `targetType` — The type of target.
- `targetId` — The ID of the target.

**Returns:** `true` if following.

#### `list(req, res)`

Lists paginated followers of a target.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `targetType` and `targetId` params.
- `res` — The response object.

#### `unfollow(followerId, targetType, targetId)`

Removes a follow relationship.

```typescript
function unfollow(followerId: string, targetType: string, targetId: string): Promise<void>
```

- `followerId` — The ID of the follower.
- `targetType` — The type of target.
- `targetId` — The ID of the target.

### Constants

#### `requestHandlerMap`

Handler map for follow routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly del: typeof del; readonly list: typeof list; readonly following: typeof following; readonly checkFollowing: typeof checkFollowing; }
```

#### `routes`

Routes for follow/unfollow, followers, following, and status check.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/follow/:targetType/:targetId"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/follow/:targetType/:targetId"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:targetType/:targetId/followers"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/following"; readonly handler: "following"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/follow/check/:targetType/:targetId"; readonly handler: "checkFollowing"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
