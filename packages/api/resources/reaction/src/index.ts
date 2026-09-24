/**
 * Like/emoji reactions resource for molecule.dev.
 *
 * Polymorphic reactions that attach to any resource type. Supports multiple
 * reaction types (like, love, laugh, etc.) with idempotent add/remove.
 *
 * @module
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   addReaction,
 *   getReactionSummary,
 *   removeReaction,
 *   requestHandlerMap as Reaction,
 * } from '@molecule/api-resource-reaction'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // What `mlcl inject` generates from `routes`. Mount AFTER the app's global auth middleware
 * // (it sets res.locals.session; POST/DELETE answer 401 without it, GET stays public).
 * export const router = express.Router()
 * router.post('/:resourceType/:resourceId/reactions', Reaction.create) // body { type: 'like' }
 * router.delete('/:resourceType/:resourceId/reactions', Reaction.del) // ?type=like, else ALL of mine
 * router.get('/:resourceType/:resourceId/reactions', Reaction.list)
 *
 * // Server-side equivalent, as the SESSION user:
 * const userId = 'user-123'
 * await addReaction('post', 'post-42', userId, 'like')
 * await addReaction('post', 'post-42', userId, 'like') // idempotent — still one 'like'
 * await addReaction('post', 'post-42', userId, 'love') // a user may hold several types at once
 * await removeReaction('post', 'post-42', userId, 'love')
 * const summary = await getReactionSummary('post', 'post-42', userId)
 * console.log(summary) // { total: 1, counts: { like: 1 }, userReactions: ['like'] }
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
 * **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * Reactions are NOT exclusive (a user can both `like` and `love` the same
 * target — enforce one-per-user yourself if you want that) and `type` is any
 * 1–50 character string: `DEFAULT_REACTION_TYPES` is a suggestion, not
 * validated. `DELETE` without `?type=` removes ALL of the caller's reactions
 * on that target. The GET answers `{ total, counts, userReactions }`.
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
