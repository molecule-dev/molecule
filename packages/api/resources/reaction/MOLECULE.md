# @molecule/api-resource-reaction

Like/emoji reactions resource for molecule.dev.

Polymorphic reactions that attach to any resource type. Supports multiple
reaction types (like, love, laugh, etc.) with idempotent add/remove.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-reaction
```

## Usage

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-reaction'

// Wire routes into your Express app via mlcl inject
// POST   /:resourceType/:resourceId/reactions
// DELETE /:resourceType/:resourceId/reactions
// GET    /:resourceType/:resourceId/reactions
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
