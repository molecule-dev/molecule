/**
 * Like/emoji reactions resource for molecule.dev.
 *
 * Polymorphic reactions that attach to any resource type. Supports multiple
 * reaction types (like, love, laugh, etc.) with idempotent add/remove.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-reaction'
 *
 * // Wire routes into your Express app via mlcl inject
 * // POST   /:resourceType/:resourceId/reactions
 * // DELETE /:resourceType/:resourceId/reactions
 * // GET    /:resourceType/:resourceId/reactions
 * ```
 *
 * @remarks
 * Session-auth prerequisite: `create` and `del` read the caller from
 * `res.locals.session.userId` and fail closed with 401 — mount the routes
 * behind your global auth middleware (the declared `authenticate` middleware
 * string). Reactions are always owner-scoped: handlers derive the reacting
 * user from the SESSION, never from the request body, and `del` removes only
 * the caller's own reactions (optionally a single `type` via `?type=`).
 *
 * The GET summary route is PUBLIC by default (no `authenticate`) so anonymous
 * visitors can see counts; when a session is present it also includes the
 * current user's reactions. This resource does NOT validate that the target
 * resource exists or that the caller may see it — if reactions attach to
 * private resources in your app, gate these routes behind the parent
 * resource's own access check; this package cannot know who owns an arbitrary
 * `(resourceType, resourceId)`.
 *
 * Tables: `src/__setup__/reactions.sql` creates `reactions` (unique per
 * `(resourceType, resourceId, userId, type)` — add is idempotent). An
 * mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
 * anywhere else run it once — nothing at runtime creates them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Reacting to a target (POST `.../reactions` with a `type`) adds the
 *   user's reaction: the summary's `counts[type]` and `total` each increment
 *   by exactly one and the button shows the active state in the UI.
 * - [ ] It is idempotent — the SAME user reacting again with the SAME type
 *   does NOT double-count: the repeat POST returns the existing reaction and
 *   `counts[type]` is unchanged. A single user can inflate a type's count by
 *   at most one, however many times they tap.
 * - [ ] Switching reaction type (e.g. 👍 → ❤️) MOVES the user's reaction —
 *   old type −1, new type +1 — it does NOT leave both. Uniqueness is per
 *   `(resourceType, resourceId, userId, type)`, so a raw add of the new type
 *   just stacks a second reaction; the switch UI must remove the prior type
 *   (DELETE `?type=`) before adding the new one — verify it doesn't stack two.
 * - [ ] Un-reacting decrements correctly: DELETE `?type=` removes only that
 *   type (its `counts[type]`/`total` drop by one), DELETE with no `type`
 *   clears all of the user's reactions on the target, and deleting a reaction
 *   the user never made is a no-op — counts never go negative.
 * - [ ] The summary reflects reality after each action: `counts` per type,
 *   `total`, the current user's `userReactions`, and any "who reacted" list
 *   all match exactly what was added/removed — reload and re-check.
 * - [ ] Authorization: the reactor is ALWAYS the session user — the reacting
 *   userId comes from `res.locals.session`, never the request body, so a
 *   caller cannot react as someone else by supplying an id; a user can remove
 *   only their OWN reaction; POST/DELETE require an authenticated session
 *   (401 without) while the GET summary is public; and since this package does
 *   not verify target visibility, reacting must be reachable only for
 *   resources the user may see — gate the routes behind the parent resource's
 *   own access check.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
