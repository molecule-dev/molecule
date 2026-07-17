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
npm install @molecule/api-resource-activity-feed @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
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

Note: this is the *client-supplied* payload — it deliberately omits `actorId`.
The actor is derived from the authenticated session in the service/handler
(`actor = caller`), never trusted from the request body, to prevent a user from
forging activities that impersonate another user.

```typescript
interface CreateActivityInput {
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

#### `logActivity(actorId, data)`

Logs a new activity to the feed.

The actor is supplied explicitly by the caller (derived from the authenticated
session in the handler), never read from the client-supplied `data`, so a user
cannot forge activities impersonating another user.

```typescript
function logActivity(actorId: string, data: CreateActivityInput): Promise<Activity>
```

- `actorId` — The ID of the authenticated user who performed the action.
- `data` — The activity creation input (client-supplied, never includes the actor).

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

Note: `actorId` is intentionally absent — the actor is always derived from the
authenticated session in the handler (`actor = caller`), never accepted from the
client body. Adding it here would let any user forge feed entries impersonating
another user (broken access control). Mirror the comment/review/thread pattern.

```typescript
const createActivitySchema: z.ZodObject<{ action: z.ZodString; resourceType: z.ZodString; resourceId: z.ZodString; metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; }, z.core.$strip>
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
- **Migration required.** `src/__setup__/activity-feeds.sql` ships with this
  package (two tables: `activities`, `activity_seen_status`) and must exist in
  the target database before use (scaffolded apps apply it automatically).
- **The feed is GLOBAL, not per-user.** `getFeed()` returns activities from ALL
  actors (its userId param is reserved) — right for public/social timelines.
  In an app with private data, do NOT mount `GET /activities/feed` as-is: it
  exposes every user's actions to any authenticated user. Filter by
  actor/resource in your own handler instead. Unseen counts are global too.
- **`GET /activities/:resourceType/:resourceId` (timeline) ships with NO auth
  middleware** — resource timelines are public by default; add an authorizer
  when the underlying resources are private.
- **The actor is always the authenticated caller.** `POST /activities` strips
  any client-supplied `actorId` (feed-entry forgery guard). Keep that property
  in custom paths — and prefer calling `logActivity(actorId, data)` directly
  from your server-side domain handlers over round-tripping the HTTP route.
- `resourceType`/`resourceId` are free-form (no FK): pick canonical type slugs
  and reuse them across comments/bookmarks/reactions so timelines line up.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Performing an in-app action that logs an activity (`POST /activities`,
  or a server-side `logActivity()` call) records ONE entry whose `actorId`
  is the session user, with the right `action` (verb), `resourceType` +
  `resourceId` (the object acted on), and a `createdAt` timestamp — verify
  by reading it back, not by trusting the 201.
- [ ] That entry appears at the TOP of the feed (`GET /activities/feed`),
  which is strictly reverse-chronological (`createdAt` desc); logging a
  second activity pushes it above the first.
- [ ] SCOPE — know what this feed is: `getFeed()` is GLOBAL, returning
  every actor's activity (its `userId` param is reserved/unused), NOT a
  per-user or following-based feed. Confirm that is the intent. If the app
  holds ANY private or per-user data, `GET /activities/feed` as-is leaks it
  (see privacy check) — replace it with an actor/resource-filtered handler.
- [ ] Pagination is stable: page through with `limit`/`offset` back-to-back
  and every activity appears exactly once (none skipped, none duplicated),
  and `total` equals the real matching-row count. The `resourceType`/
  `action` query filters narrow the feed to only matching entries.
- [ ] `GET /activities/:resourceType/:resourceId` returns ONLY that one
  resource's timeline (reverse-chronological); an unrelated resource's
  activity is absent from it.
- [ ] Read state (if the UI shows an unseen badge): `GET /activities/unseen`
  returns a count; `POST /activities/seen { upToId }` drops it to 0; a new
  activity logged afterward raises it again. The last-seen position is
  per-user (`activity_seen_status` keyed by `userId`) — mark seen as user A
  and user B's unseen count is unaffected.
- [ ] PRIVACY / AUTHORIZATION — the actor cannot be forged: `POST
  /activities` with an `actorId` in the body still records the SESSION user
  as the actor (the schema strips it). Every endpoint fails closed for an
  anonymous caller — feed, unseen, seen, AND the timeline route (which
  ships with NO route middleware but 401s in-handler) all reject a
  sessionless request.
- [ ] No cross-user leak: another user's activity on a PRIVATE actor or
  PRIVATE object must NOT surface to a viewer not allowed to see it —
  neither through the global feed nor by guessing a `resourceId` in the
  timeline URL. If it does, add the actor/resource filter (feed) and an
  authorizer (timeline) the remarks call for; the raw global endpoints are
  not safe over private data.
