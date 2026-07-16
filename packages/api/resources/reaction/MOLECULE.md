# @molecule/api-resource-reaction

Like/emoji reactions resource for molecule.dev.

Polymorphic reactions that attach to any resource type. Supports multiple
reaction types (like, love, laugh, etc.) with idempotent add/remove.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-reaction'

// Wire routes into your Express app via mlcl inject
// POST   /:resourceType/:resourceId/reactions
// DELETE /:resourceType/:resourceId/reactions
// GET    /:resourceType/:resourceId/reactions
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-reaction @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `Reaction`

A reaction attached to a resource by a user.

```typescript
interface Reaction {
  /** Unique reaction identifier. */
  id: string
  /** The type of resource this reaction is on (e.g. 'post', 'comment'). */
  resourceType: string
  /** The ID of the resource this reaction is on. */
  resourceId: string
  /** The ID of the user who reacted. */
  userId: string
  /** The reaction type (e.g. 'like', 'love', 'laugh'). */
  type: string
  /** When the reaction was created (ISO 8601). */
  createdAt: string
  /** When the reaction was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ReactionSummary`

Summary of reactions on a resource, with counts per type and user reactions.

```typescript
interface ReactionSummary {
  /** Total number of reactions across all types. */
  total: number
  /** Count of reactions per type. */
  counts: Record<string, number>
  /** The reaction types from the current user, if any. */
  userReactions: string[]
}
```

### Types

#### `DefaultReactionType`

A default reaction type string.

```typescript
type DefaultReactionType = (typeof DEFAULT_REACTION_TYPES)[number]
```

### Functions

#### `addReaction(resourceType, resourceId, userId, type)`

Adds a reaction to a resource. If the user already has the same reaction type
on this resource, returns the existing one (idempotent).

```typescript
function addReaction(resourceType: string, resourceId: string, userId: string, type: string): Promise<Reaction>
```

- `resourceType` — The type of resource being reacted to.
- `resourceId` — The ID of the resource being reacted to.
- `userId` — The ID of the reacting user.
- `type` — The reaction type (e.g. 'like', 'love').

**Returns:** The created or existing reaction.

#### `create(req, res)`

Adds a reaction to a resource. Idempotent — adding the same reaction type
twice returns the existing reaction.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `del(req, res)`

Removes a user's reaction from a resource. Optionally removes only a specific
reaction type via query parameter.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `getReactionCounts(resourceType, resourceId)`

Gets reaction counts per type for a resource.

```typescript
function getReactionCounts(resourceType: string, resourceId: string): Promise<Record<string, number>>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.

**Returns:** A record of reaction type to count.

#### `getReactionSummary(resourceType, resourceId, userId)`

Gets a reaction summary for a resource, including counts per type and the
current user's reactions.

```typescript
function getReactionSummary(resourceType: string, resourceId: string, userId?: string): Promise<ReactionSummary>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.
- `userId` — Optional current user ID to include their reactions.

**Returns:** A reaction summary with total, counts, and user reactions.

#### `getUserReactions(resourceType, resourceId, userId)`

Gets the current user's reaction on a resource, if any.

```typescript
function getUserReactions(resourceType: string, resourceId: string, userId: string): Promise<Reaction[]>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.
- `userId` — The user ID.

**Returns:** The user's reactions on this resource.

#### `list(req, res)`

Returns a reaction summary for a resource, including counts per type
and the current user's reactions (if authenticated).

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `removeReaction(resourceType, resourceId, userId, type)`

Removes a user's reaction from a resource. If `type` is provided, removes
only that reaction type. Otherwise, removes all reactions by the user on
the resource.

```typescript
function removeReaction(resourceType: string, resourceId: string, userId: string, type?: string): Promise<void>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.
- `userId` — The ID of the user.
- `type` — Optional specific reaction type to remove.

### Constants

#### `addReactionSchema`

Schema for validating reaction creation/toggle input.

```typescript
const addReactionSchema: z.ZodObject<{ type: z.ZodString; }, z.core.$strip>
```

#### `DEFAULT_REACTION_TYPES`

Default reaction types supported out of the box.

```typescript
const DEFAULT_REACTION_TYPES: readonly ["like", "love", "laugh", "wow", "sad", "angry"]
```

#### `removeReactionSchema`

Schema for validating reaction removal input.

```typescript
const removeReactionSchema: z.ZodObject<{ type: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for reaction routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly del: typeof del; readonly list: typeof list; }
```

#### `routes`

Routes for reaction add/remove/summary.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/:resourceType/:resourceId/reactions"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/:resourceType/:resourceId/reactions"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/reactions"; readonly handler: "list"; }]
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

Session-auth prerequisite: `create` and `del` read the caller from
`res.locals.session.userId` and fail closed with 401 — mount the routes
behind your global auth middleware (the declared `authenticate` middleware
string). Reactions are always owner-scoped: handlers derive the reacting
user from the SESSION, never from the request body, and `del` removes only
the caller's own reactions (optionally a single `type` via `?type=`).

The GET summary route is PUBLIC by default (no `authenticate`) so anonymous
visitors can see counts; when a session is present it also includes the
current user's reactions. This resource does NOT validate that the target
resource exists or that the caller may see it — if reactions attach to
private resources in your app, gate these routes behind the parent
resource's own access check; this package cannot know who owns an arbitrary
`(resourceType, resourceId)`.

Tables: `src/__setup__/reactions.sql` creates `reactions` (unique per
`(resourceType, resourceId, userId, type)` — add is idempotent). An
mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
anywhere else run it once — nothing at runtime creates them.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Reacting to a target (POST `.../reactions` with a `type`) adds the
  user's reaction: the summary's `counts[type]` and `total` each increment
  by exactly one and the button shows the active state in the UI.
- [ ] It is idempotent — the SAME user reacting again with the SAME type
  does NOT double-count: the repeat POST returns the existing reaction and
  `counts[type]` is unchanged. A single user can inflate a type's count by
  at most one, however many times they tap.
- [ ] Switching reaction type (e.g. 👍 → ❤️) MOVES the user's reaction —
  old type −1, new type +1 — it does NOT leave both. Uniqueness is per
  `(resourceType, resourceId, userId, type)`, so a raw add of the new type
  just stacks a second reaction; the switch UI must remove the prior type
  (DELETE `?type=`) before adding the new one — verify it doesn't stack two.
- [ ] Un-reacting decrements correctly: DELETE `?type=` removes only that
  type (its `counts[type]`/`total` drop by one), DELETE with no `type`
  clears all of the user's reactions on the target, and deleting a reaction
  the user never made is a no-op — counts never go negative.
- [ ] The summary reflects reality after each action: `counts` per type,
  `total`, the current user's `userReactions`, and any "who reacted" list
  all match exactly what was added/removed — reload and re-check.
- [ ] Authorization: the reactor is ALWAYS the session user — the reacting
  userId comes from `res.locals.session`, never the request body, so a
  caller cannot react as someone else by supplying an id; a user can remove
  only their OWN reaction; POST/DELETE require an authenticated session
  (401 without) while the GET summary is public; and since this package does
  not verify target visibility, reacting must be reachable only for
  resources the user may see — gate the routes behind the parent resource's
  own access check.
