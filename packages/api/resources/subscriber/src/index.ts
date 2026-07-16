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
 *
 * @e2e
 * Lifecycle + authorization checklist — drive the real UI (live preview, no
 * mocks), adapt each item to this app's actual screens/flows (newsletter form,
 * status-page "subscribe to updates", the confirm + unsubscribe links), and
 * check every box off one by one. A box you can't check is an integration bug
 * to fix — not a skip. This is double-opt-in LIST membership (email/sms/webhook),
 * NOT paid billing — statuses are pending → confirmed → unsubscribed:
 * - [ ] Subscribing from the UI creates the record in `pending` (NOT yet
 *   eligible for sends) and the app delivers a confirmation link. The sandbox
 *   CAPTURES outbound email/sms instead of sending — read it with the
 *   `read_activity` tool to get the confirm link; never mock the delivery.
 * - [ ] Visiting the confirm link flips the record to `confirmed` (`confirmedAt`
 *   set) and only a confirmed subscriber receives topic deliveries; visiting the
 *   same link again is idempotent — still confirmed, no error, no re-timestamp.
 * - [ ] Using the unsubscribe link flips the record to `unsubscribed`
 *   (`unsubscribedAt` set) and stops all further sends to that address; the UI
 *   reflects the opt-out and re-posting the same link is idempotent (200).
 * - [ ] Illegal transitions are refused, never silently allowed: re-subscribing
 *   the same (channel, address, topic) returns 409 (no duplicate row, no
 *   re-trigger of sends), confirming an already-unsubscribed token is rejected
 *   (409), and an invalid or expired token shows a visible error — not a blank
 *   success.
 * - [ ] AUTHORIZATION — the one-time confirm/unsubscribe tokens are the ONLY
 *   capability: returned exactly once at signup and never re-exposed, so no
 *   caller can confirm or opt out someone else's subscription by guessing an id.
 *   The admin-only list/read/delete endpoints (they expose subscriber PII —
 *   emails, phone numbers, webhook URLs) deny an anonymous caller (401) and a
 *   non-admin authenticated user (403); no id-guessing lets a non-admin read or
 *   delete another subscriber's contact info, and those admin views never leak
 *   the confirm/unsubscribe tokens.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
