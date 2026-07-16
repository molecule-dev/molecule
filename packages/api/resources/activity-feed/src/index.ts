/**
 * Activity feed resource for molecule.dev.
 *
 * Activity timeline with logging, feed queries, resource timelines, and
 * unseen-count tracking. Activities can reference any resource type.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-activity-feed'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST /activities           — log an activity
 * // GET  /activities/feed      — paginated user feed
 * // GET  /activities/unseen    — unseen count
 * // POST /activities/seen      — mark seen up to ID
 * // GET  /activities/:resourceType/:resourceId — resource timeline
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/activity-feeds.sql` ships with this
 *   package (two tables: `activities`, `activity_seen_status`) and must exist in
 *   the target database before use (scaffolded apps apply it automatically).
 * - **The feed is GLOBAL, not per-user.** `getFeed()` returns activities from ALL
 *   actors (its userId param is reserved) — right for public/social timelines.
 *   In an app with private data, do NOT mount `GET /activities/feed` as-is: it
 *   exposes every user's actions to any authenticated user. Filter by
 *   actor/resource in your own handler instead. Unseen counts are global too.
 * - **`GET /activities/:resourceType/:resourceId` (timeline) ships with NO auth
 *   middleware** — resource timelines are public by default; add an authorizer
 *   when the underlying resources are private.
 * - **The actor is always the authenticated caller.** `POST /activities` strips
 *   any client-supplied `actorId` (feed-entry forgery guard). Keep that property
 *   in custom paths — and prefer calling `logActivity(actorId, data)` directly
 *   from your server-side domain handlers over round-tripping the HTTP route.
 * - `resourceType`/`resourceId` are free-form (no FK): pick canonical type slugs
 *   and reuse them across comments/bookmarks/reactions so timelines line up.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Performing an in-app action that logs an activity (`POST /activities`,
 *   or a server-side `logActivity()` call) records ONE entry whose `actorId`
 *   is the session user, with the right `action` (verb), `resourceType` +
 *   `resourceId` (the object acted on), and a `createdAt` timestamp — verify
 *   by reading it back, not by trusting the 201.
 * - [ ] That entry appears at the TOP of the feed (`GET /activities/feed`),
 *   which is strictly reverse-chronological (`createdAt` desc); logging a
 *   second activity pushes it above the first.
 * - [ ] SCOPE — know what this feed is: `getFeed()` is GLOBAL, returning
 *   every actor's activity (its `userId` param is reserved/unused), NOT a
 *   per-user or following-based feed. Confirm that is the intent. If the app
 *   holds ANY private or per-user data, `GET /activities/feed` as-is leaks it
 *   (see privacy check) — replace it with an actor/resource-filtered handler.
 * - [ ] Pagination is stable: page through with `limit`/`offset` back-to-back
 *   and every activity appears exactly once (none skipped, none duplicated),
 *   and `total` equals the real matching-row count. The `resourceType`/
 *   `action` query filters narrow the feed to only matching entries.
 * - [ ] `GET /activities/:resourceType/:resourceId` returns ONLY that one
 *   resource's timeline (reverse-chronological); an unrelated resource's
 *   activity is absent from it.
 * - [ ] Read state (if the UI shows an unseen badge): `GET /activities/unseen`
 *   returns a count; `POST /activities/seen { upToId }` drops it to 0; a new
 *   activity logged afterward raises it again. The last-seen position is
 *   per-user (`activity_seen_status` keyed by `userId`) — mark seen as user A
 *   and user B's unseen count is unaffected.
 * - [ ] PRIVACY / AUTHORIZATION — the actor cannot be forged: `POST
 *   /activities` with an `actorId` in the body still records the SESSION user
 *   as the actor (the schema strips it). Every endpoint fails closed for an
 *   anonymous caller — feed, unseen, seen, AND the timeline route (which
 *   ships with NO route middleware but 401s in-handler) all reject a
 *   sessionless request.
 * - [ ] No cross-user leak: another user's activity on a PRIVATE actor or
 *   PRIVATE object must NOT surface to a viewer not allowed to see it —
 *   neither through the global feed nor by guessing a `resourceId` in the
 *   timeline URL. If it does, add the actor/resource filter (feed) and an
 *   authorizer (timeline) the remarks call for; the raw global endpoints are
 *   not safe over private data.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
