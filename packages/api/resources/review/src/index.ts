/**
 * Reviews with ratings resource for molecule.dev.
 *
 * Polymorphic reviews that attach to any resource type. Supports star ratings
 * (1–5), title/body text, helpfulness voting, and aggregate rating statistics.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-review'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /:resourceType/:resourceId/reviews
 * // GET    /:resourceType/:resourceId/reviews
 * // GET    /:resourceType/:resourceId/reviews/rating
 * // GET    /reviews/:reviewId
 * // PUT    /reviews/:reviewId
 * // DELETE /reviews/:reviewId
 * // POST   /reviews/:reviewId/helpful
 * ```
 *
 * @remarks
 * Session-auth prerequisite: the mutating handlers (`create`, `update`, `del`,
 * `helpful`) read the caller from `res.locals.session.userId` and fail closed
 * with 401 — mount the routes behind your global auth middleware (the declared
 * `authenticate` middleware string). Ownership is enforced in the service
 * layer: `update`/`del` act only when the review's `userId` matches the
 * AUTHENTICATED caller (a non-owner gets 404, not 403 — existence is not
 * leaked). Never pass a client-supplied user id.
 *
 * One review per user per resource: `reviews` is UNIQUE on
 * `(resourceType, resourceId, userId)` — a second `create` for the same
 * resource fails at the database; use `update` to change an existing review.
 * Helpful votes are idempotent (`review_helpful` is keyed by
 * `(reviewId, userId)`; duplicates are silently ignored).
 *
 * The read routes (`list`, `read`, `averageRating`) are PUBLIC by default so
 * anonymous visitors can browse ratings. This package does NOT validate that
 * the reviewed resource exists or is visible to the caller — if reviews
 * attach to private resources in your app, gate these routes behind the
 * parent resource's own access check.
 *
 * Tables: `src/__setup__/reviews.sql` creates `reviews` and `review_helpful`.
 * An mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
