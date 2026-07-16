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
