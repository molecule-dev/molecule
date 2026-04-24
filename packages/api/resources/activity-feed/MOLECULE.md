# @molecule/api-resource-activity-feed

Activity feed resource for molecule.dev.

Activity timeline with logging, feed queries, resource timelines, and
unseen-count tracking. Activities can reference any resource type.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-activity-feed'

// Wire routes into your Express app via mlcl inject
// POST /activities           — log an activity
// GET  /activities/feed      — paginated user feed
// GET  /activities/unseen    — unseen count
// POST /activities/seen      — mark seen up to ID
// GET  /activities/:resourceType/:resourceId — resource timeline
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-activity-feed
```

## API

### Interfaces

#### `Activity`

A single activity entry in the feed.

```typescript
interface Activity {
  /** Unique activity identifier. */
  id: string
  /** The ID of the user who performed the action. */
  actorId: string
  /** The action that was performed (e.g. 'created', 'updated', 'commented'). */
  action: string
  /** The type of resource the action was performed on (e.g. 'post', 'project'). */
  resourceType: string
  /** The ID of the resource the action was performed on. */
  resourceId: string
  /** Optional metadata associated with the activity. */
  metadata: Record<string, unknown> | null
  /** When the activity was created (ISO 8601). */
  createdAt: string
}
```

#### `ActivitySeenStatus`

Tracks the last-seen activity position for a user.

```typescript
interface ActivitySeenStatus {
  /** The user ID. */
  userId: string
  /** The ID of the last activity seen by this user. */
  lastSeenActivityId: string
  /** When this seen status was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `CreateActivityInput`

Input for logging a new activity.

```typescript
interface CreateActivityInput {
  /** The ID of the user who performed the action. */
  actorId: string
  /** The action that was performed. */
  action: string
  /** The type of resource the action was performed on. */
  resourceType: string
  /** The ID of the resource the action was performed on. */
  resourceId: string
  /** Optional metadata associated with the activity. */
  metadata?: Record<string, unknown>
}
```

#### `FeedQuery`

Options for querying a user's activity feed.

```typescript
interface FeedQuery extends PaginationOptions {
  /** Filter to only activities involving this resource type. */
  resourceType?: string
  /** Filter to only activities with this action. */
  action?: string
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

#### `feed(req, res)`

Retrieves the paginated activity feed for the authenticated user.

```typescript
function feed(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional query params for filtering and pagination.
- `res` — The response object.

#### `getFeed(_userId, options)`

Retrieves a paginated activity feed for a user. Returns activities from
all actors, optionally filtered by resource type or action.

```typescript
function getFeed(_userId: string, options?: FeedQuery): Promise<PaginatedResult<Activity>>
```

- `_userId` — The user requesting the feed (reserved for future per-user filtering).
- `options` — Query and pagination options.

**Returns:** A paginated result of activities.

#### `getTimeline(resourceType, resourceId, options)`

Retrieves a paginated timeline of activities for a specific resource.

```typescript
function getTimeline(resourceType: string, resourceId: string, options?: PaginationOptions): Promise<PaginatedResult<Activity>>
```

- `resourceType` — The resource type to get the timeline for.
- `resourceId` — The resource ID to get the timeline for.
- `options` — Pagination options.

**Returns:** A paginated result of activities.

#### `getUnseenCount(userId)`

Returns the number of unseen activities for a user.
An activity is unseen if it was created after the user's last-seen position,
or if the user has never marked anything as seen.

```typescript
function getUnseenCount(userId: string): Promise<number>
```

- `userId` — The user ID.

**Returns:** The count of unseen activities.

#### `log(req, res)`

Logs a new activity to the feed.

```typescript
function log(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with activity creation body.
- `res` — The response object.

#### `logActivity(data)`

Logs a new activity to the feed.

```typescript
function logActivity(data: CreateActivityInput): Promise<Activity>
```

- `data` — The activity creation input.

**Returns:** The created activity.

#### `markSeen(userId, upToId)`

Marks activities as seen for a user up to a given activity ID.

```typescript
function markSeen(userId: string, upToId: string): Promise<void>
```

- `userId` — The user marking activities as seen.
- `upToId` — The ID of the last activity seen.

#### `seen(req, res)`

Marks activities as seen for the authenticated user up to a given activity ID.

```typescript
function seen(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `upToId` in body.
- `res` — The response object.

#### `timeline(req, res)`

Retrieves the paginated activity timeline for a specific resource.

```typescript
function timeline(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `unseen(_req, res)`

Returns the number of unseen activities for the authenticated user.

```typescript
function unseen(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

### Constants

#### `createActivitySchema`

Schema for validating activity creation input.

```typescript
const createActivitySchema: z.ZodObject<{ actorId: z.ZodString; action: z.ZodString; resourceType: z.ZodString; resourceId: z.ZodString; metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>
```

#### `markSeenSchema`

Schema for validating mark-seen input.

```typescript
const markSeenSchema: z.ZodObject<{ upToId: z.ZodString; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for activity feed routes.

```typescript
const requestHandlerMap: { readonly logActivity: typeof log; readonly feed: typeof feed; readonly unseen: typeof unseen; readonly markSeen: typeof seen; readonly timeline: typeof timeline; }
```

#### `routes`

Routes for activity feed operations.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/activities"; readonly handler: "logActivity"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/activities/feed"; readonly handler: "feed"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/activities/unseen"; readonly handler: "unseen"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/activities/seen"; readonly handler: "markSeen"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/activities/:resourceType/:resourceId"; readonly handler: "timeline"; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0
