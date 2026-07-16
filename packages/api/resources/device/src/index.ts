/**
 * The `device` resource for molecule.dev — one row per signed-in browser or
 * app install, owned by a user. Devices anchor session context and push
 * delivery: the row stores `pushPlatform`/`pushSubscription`, the routes cover
 * device list/read/update/delete plus `GET /devices/push/public-key` (the
 * VAPID key browsers need to subscribe), and API-side push fan-outs read the
 * stored subscriptions.
 *
 * @example
 * ```typescript
 * import { createRequestHandler } from '@molecule/api-resource'
 * import {
 *   createRequestHandlerMap,
 *   resource,
 *   routes,
 * } from '@molecule/api-resource-device'
 *
 * // Unlike newer resources, the handler map is a FACTORY — build it with the
 * // createRequestHandler from @molecule/api-resource (mlcl inject does this):
 * const requestHandlerMap = createRequestHandlerMap(createRequestHandler)
 * ```
 *
 * @remarks
 * - **Table setup:** `setup/devices.sql` ships with this package (the standard
 *   scaffold applies it as a base migration; `resource.tableName` is `devices`).
 *   When adding to an existing app, apply it before use.
 * - **The handler map is a factory, not a constant.** Call
 *   `createRequestHandlerMap(createRequestHandler)`; do not import a
 *   `requestHandlerMap` constant like other resources export. Its `auth` /
 *   `authUser` entries are the authorizer middlewares the routes reference —
 *   `authUser` enforces that the session user OWNS the device row; removing
 *   either from the map ships the routes ungated (IDOR on other users' devices).
 * - **Device rows are created by the auth flow, not by these routes** — there is
 *   no `POST /devices`; signup/login registers the caller's device. Clients then
 *   save their push subscription via
 *   `PATCH /devices/:id { pushSubscription, hasPushSubscription }` — the
 *   contract the push fan-outs read.
 * - **`GET /devices/push/public-key` is unauthenticated by design** (VAPID public
 *   keys are public) and bond-gated: 404 when no `push-notifications` bond is
 *   wired, 503 when it is wired but unconfigured (`VAPID_PUBLIC_KEY` unset) —
 *   never a crash. Surface those states in the client instead of retrying.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Registering a device persists a real row that appears in the signed-in
 *   user's device list: sign in on a fresh browser/install, open GET /devices,
 *   and the device shows with its `name` and timestamps — the current session's
 *   device sorted first and flagged `isCurrent: true`. Rows are created by the
 *   AUTH flow (signup/login → `createOrUpdate`), NOT a POST route; there is no
 *   `POST /devices`.
 * - [ ] Re-registering the SAME device does not duplicate it: sign in again from
 *   the same device (same user + device `name`) and the existing row is reused
 *   with a bumped `updatedAt` — the list count is unchanged, no second row
 *   appears. (The dedup key here is user + `name`, not a push token.)
 * - [ ] Saving a push subscription targets THIS device and only opted-in ones:
 *   PATCH /devices/:id { pushSubscription, pushPlatform, hasPushSubscription:
 *   true } stores the subscription (`pushSubscription` is what push actually
 *   targets), and a real push fan-out reaches exactly the user's devices where
 *   `hasPushSubscription` is true (`getWithPushSubscription`) — a device that
 *   never subscribed receives nothing.
 * - [ ] Refreshing the subscription replaces the stale one: PATCH the same
 *   device with a new `pushSubscription` and the next push goes to the NEW value,
 *   never the old — one current subscription per device, not a growing list.
 *   Clearing it (`hasPushSubscription: false`) drops the device from the fan-out
 *   set immediately, so it stops receiving.
 * - [ ] Last-seen tracks use: an active device's `updatedAt` advances on
 *   re-registration / `updateLastSeen`, so the list reflects recency.
 * - [ ] Removing a device deletes it and it can no longer be targeted OR used:
 *   DELETE /devices/:id removes the row, so it disappears from GET /devices, is
 *   excluded from every push fan-out, AND its session is revoked — the JWT bound
 *   to that `deviceId` is rejected on its very next request (`exists()` → false),
 *   for every copy of the token.
 * - [ ] AUTHORIZATION — devices are strictly per-user. GET /devices returns ONLY
 *   the session user's own rows; reading, updating, or deleting via /devices/:id
 *   is gated by `authUser`, which requires the device `id` AND its `userId` to
 *   match the session — so guessing another user's device id is rejected (401,
 *   no IDOR into their row or push subscription). The owner is always the session
 *   user: a device is registered under the caller's own `userId`, and one user
 *   can never PATCH a push subscription onto another user's device.
 *
 * @module
 */

export * from './browser-guard.js'
export * as authorizers from './authorizers/index.js'
export * as handlers from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './resource.js'
export * from './routes.js'
export * from './schema.js'
export * from './service.js'
export * as types from './types.js'
