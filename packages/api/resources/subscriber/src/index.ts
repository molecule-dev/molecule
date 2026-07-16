/**
 * Subscriber resource for molecule.dev.
 *
 * Tokenized email/sms/webhook subscriber records with confirm/unsubscribe links.
 * Designed for status-page-style "subscribe to incident updates" and newsletter
 * signup flows. A subscriber is created in `pending` status and confirmed via a
 * one-time token; opt-out is one-click via a separate unsubscribe token. Both
 * tokens are returned exactly once on creation and are never exposed via the
 * public listing/read endpoints.
 *
 * The `list`, `read`, and `del` routes are **admin-only** — always apply their
 * declared `middlewares` (the `requireAdmin` authorizer) when wiring, as shown
 * below. Each handler also re-checks admin authorization internally, so the gate
 * holds even if the middlewares are omitted; "admin" resolves via an admin
 * session claim or an `@molecule/api-permissions` grant, fail-closed otherwise.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-subscriber'
 *
 * for (const route of routes) {
 *   // Only the admin-only routes declare `middlewares` (routes is a const union).
 *   const names = 'middlewares' in route ? route.middlewares : []
 *   const middlewares = names.map((name) => requestHandlerMap[name])
 *   app[route.method](route.path, ...middlewares, requestHandlerMap[route.handler])
 * }
 * ```
 *
 * @remarks
 * Delivery is YOUR app's concern: `subscribe` stores the record and returns
 * `{ subscriber, confirmToken, unsubscribeToken }` exactly once (201) — this
 * package sends nothing. Build the confirm/unsubscribe links from those tokens
 * and deliver them via your email/SMS/webhook bond. Re-subscribing an existing
 * `(channel, address, topic)` returns 409.
 *
 * Tables: `src/__setup__/subscribers.sql` creates `subscribers` (unique per
 * `(channel, address, topic)`, unique token indexes). An mlcl-scaffolded API
 * replays `__setup__/*.sql` automatically on migrate; anywhere else run it
 * once — nothing at runtime creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
