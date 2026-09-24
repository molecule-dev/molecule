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
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { requestHandlerMap as Subscriber } from '@molecule/api-resource-subscriber'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // What `mlcl inject` generates from `routes`, mounted AFTER the global auth middleware.
 * export const router = express.Router()
 * router.post('/subscribers', Subscriber.subscribe) // public
 * router.get('/subscribers/confirm/:token', Subscriber.confirm) // public (the emailed link)
 * router.post('/subscribers/unsubscribe/:token', Subscriber.unsubscribe) // public, one-click
 * router.get('/subscribers', Subscriber.requireAdmin, Subscriber.list)
 * router.get('/subscribers/:id', Subscriber.requireAdmin, Subscriber.read)
 * router.delete('/subscribers/:id', Subscriber.requireAdmin, Subscriber.del)
 *
 * // Visitor: POST /subscribers { channel: 'email', address: 'ada@example.com', topic: 'incidents' }
 * //   → 201 { subscriber: { id, status: 'pending', ... }, confirmToken, unsubscribeToken }
 * //   (tokens are returned ONCE — email the links yourself; this package sends nothing)
 * // GET  /subscribers/confirm/<confirmToken>         → 200 { status: 'confirmed', ... }
 * // POST /subscribers/unsubscribe/<unsubscribeToken> → 200 { status: 'unsubscribed', ... }
 * ```
 *
 * @remarks
 * - **Bond the DataStore before mounting** (`setStore(...)`), or every handler answers 500.
 * - `channel` must be `'email' | 'sms' | 'webhook'` and `address` must match it (400 otherwise).
 *   Only `confirmed` subscribers should receive sends — filter on `status` yourself.
 * - `requireAdmin` rejects via `next(message)`, so without an app error handler Express answers
 *   500 (the handlers themselves answer 401/403 JSON if the middleware is skipped).
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

export * from './authorizers/index.js'
export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
