# @molecule/api-resource-review

Reviews with ratings resource for molecule.dev.

Polymorphic reviews that attach to any resource type. Supports star ratings
(1–5), title/body text, helpfulness voting, and aggregate rating statistics.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-review'

// Wire routes into your Express app via mlcl inject
// POST   /:resourceType/:resourceId/reviews
// GET    /:resourceType/:resourceId/reviews
// GET    /:resourceType/:resourceId/reviews/rating
// GET    /reviews/:reviewId
// PUT    /reviews/:reviewId
// DELETE /reviews/:reviewId
// POST   /reviews/:reviewId/helpful
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-review
```

## API

### Interfaces

#### `CreateReviewInput`

Input for creating a new review.

```typescript
interface CreateReviewInput {
  /** Numeric rating (1–5). */
  rating: number
  /** Short review title/summary. */
  title: string
  /** Detailed review body text. */
  body: string
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

#### `RatingStats`

Aggregate rating statistics for a resource.

```typescript
interface RatingStats {
  /** Average rating across all reviews. */
  average: number
  /** Total number of reviews. */
  count: number
  /** Breakdown of reviews by star rating (1–5). */
  distribution: Record<number, number>
}
```

#### `Review`

A review attached to a resource, with a numeric rating and optional body.

```typescript
interface Review {
  /** Unique review identifier. */
  id: string
  /** The type of resource this review is attached to (e.g. 'product', 'course'). */
  resourceType: string
  /** The ID of the resource this review is attached to. */
  resourceId: string
  /** The ID of the user who created this review. */
  userId: string
  /** Numeric rating (1–5). */
  rating: number
  /** Short review title/summary. */
  title: string
  /** Detailed review body text. */
  body: string
  /** Number of users who marked this review as helpful. */
  helpful: number
  /** When the review was created (ISO 8601). */
  createdAt: string
  /** When the review was last updated (ISO 8601). */
  updatedAt: string
}
```

#### `ReviewHelpful`

A record of a user marking a review as helpful.

```typescript
interface ReviewHelpful {
  /** The review that was marked helpful. */
  reviewId: string
  /** The user who marked it helpful. */
  userId: string
  /** When it was marked helpful (ISO 8601). */
  createdAt: string
}
```

#### `ReviewQuery`

Query options for listing reviews with optional sorting.

```typescript
interface ReviewQuery extends PaginationOptions {
  /** Sort field. Defaults to 'createdAt'. */
  sortBy?: 'createdAt' | 'rating' | 'helpful'
  /** Sort direction. Defaults to 'desc'. */
  sortDirection?: 'asc' | 'desc'
}
```

#### `UpdateReviewInput`

Input for updating an existing review.

```typescript
interface UpdateReviewInput {
  /** Updated numeric rating (1–5). */
  rating?: number
  /** Updated review title. */
  title?: string
  /** Updated review body text. */
  body?: string
}
```

### Functions

#### `averageRating(req, res)`

Returns aggregate rating statistics for a resource.

```typescript
function averageRating(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `create(req, res)`

Creates a new review on a resource.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params and review body.
- `res` — The response object.

#### `createReview(resourceType, resourceId, userId, data)`

Creates a new review on a resource. One review per user per resource.

```typescript
function createReview(resourceType: string, resourceId: string, userId: string, data: CreateReviewInput): Promise<Review>
```

- `resourceType` — The type of resource being reviewed.
- `resourceId` — The ID of the resource being reviewed.
- `userId` — The ID of the reviewing user.
- `data` — The review creation input.

**Returns:** The created review.

#### `del(req, res)`

Deletes a review. Only the review owner can delete.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reviewId` param.
- `res` — The response object.

#### `deleteReview(reviewId, userId)`

Deletes a review. Only the review owner can delete.

```typescript
function deleteReview(reviewId: string, userId: string): Promise<boolean>
```

- `reviewId` — The review ID to delete.
- `userId` — The requesting user's ID (must match review owner).

**Returns:** `true` if deleted, `false` if not found or unauthorized.

#### `getAverageRating(resourceType, resourceId)`

Computes aggregate rating statistics for a resource.

```typescript
function getAverageRating(resourceType: string, resourceId: string): Promise<RatingStats>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.

**Returns:** Rating statistics including average, count, and distribution.

#### `getReviewById(reviewId)`

Retrieves a single review by ID.

```typescript
function getReviewById(reviewId: string): Promise<Review | null>
```

- `reviewId` — The review ID to look up.

**Returns:** The review or `null` if not found.

#### `getReviewsByResource(resourceType, resourceId, options)`

Retrieves paginated reviews for a resource with optional sorting.

```typescript
function getReviewsByResource(resourceType: string, resourceId: string, options?: ReviewQuery): Promise<PaginatedResult<Review>>
```

- `resourceType` — The type of resource.
- `resourceId` — The ID of the resource.
- `options` — Query options (pagination and sorting).

**Returns:** A paginated result of reviews.

#### `helpful(req, res)`

Marks a review as helpful. Idempotent — duplicate votes are silently ignored.

```typescript
function helpful(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reviewId` param.
- `res` — The response object.

#### `list(req, res)`

Lists paginated reviews for a resource with optional sorting.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `resourceType` and `resourceId` params.
- `res` — The response object.

#### `markHelpful(reviewId, userId)`

Marks a review as helpful by a user. Idempotent — duplicate votes are ignored.

```typescript
function markHelpful(reviewId: string, userId: string): Promise<void>
```

- `reviewId` — The review to mark as helpful.
- `userId` — The user marking it helpful.

#### `read(req, res)`

Retrieves a single review by ID.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reviewId` param.
- `res` — The response object.

#### `update(req, res)`

Updates an existing review. Only the review owner can update.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reviewId` param and update body.
- `res` — The response object.

#### `updateReview(reviewId, userId, data)`

Updates a review. Only the review owner can update.

```typescript
function updateReview(reviewId: string, userId: string, data: UpdateReviewInput): Promise<Review | null>
```

- `reviewId` — The review ID to update.
- `userId` — The requesting user's ID (must match review owner).
- `data` — The update input.

**Returns:** The updated review or `null` if not found or unauthorized.

### Constants

#### `createReviewSchema`

Schema for validating review creation input.

```typescript
const createReviewSchema: z.ZodObject<{ rating: z.ZodNumber; title: z.ZodString; body: z.ZodString; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for review routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly averageRating: typeof averageRating; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly helpful: typeof helpful; }
```

#### `routes`

Routes for review CRUD, rating statistics, and helpfulness voting.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/:resourceType/:resourceId/reviews"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/reviews"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/:resourceType/:resourceId/reviews/rating"; readonly handler: "averageRating"; }, { readonly method: "get"; readonly path: "/reviews/:reviewId"; readonly handler: "read"; }, { readonly method: "put"; readonly path: "/reviews/:reviewId"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/reviews/:reviewId"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/reviews/:reviewId/helpful"; readonly handler: "helpful"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `updateReviewSchema`

Schema for validating review update input. All fields are optional.

```typescript
const updateReviewSchema: z.ZodObject<{ rating: z.ZodOptional<z.ZodNumber>; title: z.ZodOptional<z.ZodString>; body: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0
