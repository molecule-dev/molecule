/**
 * Follow/unfollow resource for molecule.dev.
 *
 * Polymorphic follow system for users or any resource type. Supports
 * followers list, following list, and follow status checks.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { follow, getFollowerCount, isFollowing, unfollow } from '@molecule/api-resource-follow'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL). `mlcl inject`
 * // mounts `routes` onto `requestHandlerMap` (POST/DELETE /follow/:targetType/:targetId,
 * // GET /:targetType/:targetId/followers, GET /following, GET /follow/check/:targetType/:targetId).
 * setStore(store)
 *
 * // Server-side: the follower is the SESSION user (res.locals.session.userId), never the body.
 * const followerId = 'user-123'
 * await follow(followerId, 'user', 'user-456') // idempotent — re-following returns the same row
 * const following = await isFollowing(followerId, 'user', 'user-456') // true
 * const followers = await getFollowerCount('user', 'user-456') // badge count
 *
 * await unfollow(followerId, 'user', 'user-456')
 * console.log(following, followers)
 * ```
 *
 * @remarks
 * - **Bond the DataStore before any call.** Every service function goes through
 *   `@molecule/api-database`; without `setStore(...)` at startup they throw
 *   "DataStore not configured".
 * - **Self-follows are NOT blocked** (neither in `follow()` nor the route) —
 *   reject `targetType === 'user' && targetId === session.userId` yourself if
 *   that matters.
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
 *
 * Table: `src/__setup__/follows.sql` creates the single `follows` table. An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates it.
 *
 * The follower is ALWAYS the authenticated user: handlers read
 * `res.locals.session` (populated by your global auth middleware) and 401
 * without it — never accept a follower userId from the body or params.
 * `GET /:targetType/:targetId/followers` is deliberately PUBLIC; gate it
 * yourself if follower lists are private in your app.
 *
 * `targetType` is a free-form string (`user`, `post`, …) — the package does
 * not validate it against your schema, so constrain accepted values in your
 * app if arbitrary types would be a problem.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] User A follows user B (`POST /follow/user/:B`): B's follower count and
 *   A's following count each increment by exactly one, B appears in A's
 *   following list (`GET /following`) and A appears in B's followers list
 *   (`GET /user/:B/followers`). Reload — the edge and both counts persist (it's
 *   a real `follows` row, not local UI state).
 * - [ ] Following is IDEMPOTENT: A following B a second time (double-tap Follow
 *   or replay the POST) creates NO duplicate edge and does NOT double-count —
 *   exactly one `follows` row exists for (A → B) and both counts are unchanged.
 * - [ ] Unfollow (`DELETE /follow/user/:B`) removes the edge: A's following
 *   count and B's follower count each decrement back, B leaves A's following
 *   list, A leaves B's followers, and `GET /follow/check/user/:B` now returns
 *   `{ following: false }`.
 * - [ ] You cannot follow yourself: the UI never offers Follow on your own
 *   profile, and following your own id never inflates your own counts. This
 *   package's `follow()` does not reject `followerId === targetId`, so the app
 *   must guard it — verify the guard exists, don't assume it.
 * - [ ] AUTHORIZATION — the follower is ALWAYS the session user: handlers read
 *   `res.locals.session` and 401 without it, so no UI or endpoint lets you
 *   follow/unfollow on behalf of another user by passing their id, and
 *   follow/unfollow act only on your own edges. Signed in as A you can never
 *   make B follow or unfollow anyone.
 */

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
