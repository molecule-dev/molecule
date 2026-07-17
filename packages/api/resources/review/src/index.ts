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
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server) / `res.data.data` (client, after the
 *   HttpResponse wrapper). Treating the response as a bare array — or `unwrapList`, which only
 *   peels a PURE single-key `{ data }` — yields an EMPTY list.
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
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual review screens/flows, and check every box
 * off one by one. A box you can't check is an integration bug to fix — not a
 * skip. Verify BEHAVIOR and the business rules, not just that CRUD compiles:
 * - [ ] Submitting a review for a resource (its resourceType/resourceId — a
 *   product, course, place, whatever this app reviews) persists the rating
 *   (1-5) + title + body, and it then appears in that resource's review list
 *   and when fetched by its own review id.
 * - [ ] The aggregate recomputes correctly (the rating-stats endpoint returns
 *   average + count + a per-star distribution): on a resource with no reviews,
 *   add a 5-star and a 1-star review -> average is 3, count is 2, distribution
 *   shows one 5 and one 1; then edit one rating or delete a review and confirm
 *   average/count move to match (the math is live, never stale).
 * - [ ] A rating outside 1-5 or non-integer (0, 6, 3.5) is REJECTED with a
 *   visible validation error and NO row is written — the average and count do
 *   not move; an empty title or empty body is rejected the same way.
 * - [ ] One review per user per resource is enforced (the table is UNIQUE on
 *   resourceType+resourceId+userId): the same user's SECOND review of the same
 *   resource is rejected — no duplicate row inflates the count/average; the way
 *   to change their mind is EDITING the existing review, which updates it in
 *   place.
 * - [ ] Reviews are public and appear immediately — this package has NO
 *   moderation or verified-purchase gate and does NOT check the resource
 *   exists, was purchased, or isn't the reviewer's own listing; any signed-in
 *   user can review any resourceType/resourceId. If the app needs those gates,
 *   confirm they are layered on top, and confirm the anonymous read routes only
 *   expose reviews for resources the caller is allowed to see.
 * - [ ] AUTHORIZATION — a signed-in user can edit/delete ONLY their own review;
 *   editing or deleting someone else's returns not-found (404 — existence is
 *   not leaked) and leaves that review unchanged. Mutations require a session
 *   (signed-out is rejected 401) and the author is taken from the session, so a
 *   caller cannot post or edit as another user by supplying a userId.
 * - [ ] Helpful voting is idempotent: marking a review helpful bumps its
 *   helpful count by exactly one; the same user marking it again does not
 *   increment it again (no vote stuffing).
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
