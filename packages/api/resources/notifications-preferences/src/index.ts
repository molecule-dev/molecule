/**
 * Notification preferences resource for molecule.dev.
 *
 * Per-user channel toggles keyed by canonical event-type slug — used as the
 * delivery gate for email / push / sms / in-app notifications. Pairs with
 * `@molecule/api-resource-notification` (which stores the resulting
 * notifications) and the various dispatch bonds under
 * `@molecule/api-notifications-*`.
 *
 * @module
 * @example
 * ```typescript
 * import express from 'express'
 *
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import {
 *   isEnabled,
 *   requestHandlerMap as NotificationPreferences,
 *   updatePreferences,
 * } from '@molecule/api-notifications-preferences'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // What `mlcl inject` generates from `routes`. Mount AFTER the app's global auth middleware
 * // (it sets res.locals.session; without it both routes answer 401).
 * export const router = express.Router()
 * router.get('/me/notification-preferences', NotificationPreferences.getPreferences)
 * router.put('/me/notification-preferences', NotificationPreferences.updatePreferences)
 *
 * // PUT body (the bare map, not wrapped): { "order.shipped": { "email": false } }
 * const userId = 'user-123' // the SESSION user
 * await updatePreferences(userId, { 'order.shipped': { email: false } })
 *
 * // Gate EVERY dispatch path — absence of a preference means enabled.
 * const sendEmail = await isEnabled(userId, 'order.shipped', 'email') // false
 * const sendPush = await isEnabled(userId, 'order.shipped', 'push') // true (untouched channel)
 * console.log(sendEmail, sendPush)
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/notifications_preferences.sql` ships
 *   with this package and must exist in the target database before use
 *   (scaffolded apps apply it automatically; when adding to an existing app,
 *   apply it — adapted to your database bond — first).
 * - **Default-ON semantics: absence means ENABLED.** A user with no row, no entry
 *   for a type, or no field for a channel is opted IN. Always gate delivery with
 *   `isEnabled(userId, type, channel)`; never inspect the `getPreferences()` map
 *   directly — naive missing-key checks either drop wanted notifications or spam
 *   users who opted out.
 * - **The gate only works where it is called.** Every server-side dispatch path
 *   (email/push/sms/in-app senders, cron jobs, event hooks) must call
 *   `isEnabled()` before sending. The shipped routes only manage stored
 *   preferences; nothing enforces them automatically.
 * - **Routes are session-scoped** (`/me/notification-preferences`, `authenticate`):
 *   the handlers take the user from the session — never accept a target userId
 *   from the client for reads or writes.
 * - **Bond the DataStore first** (`setStore(...)` from `@molecule/api-database`).
 * - The `PUT` body IS the partial map (`{ [type]: { email?, push?, sms?, inApp? } }`,
 *   booleans only — anything else is a 400); both routes answer
 *   `{ preferences: {...} }`, so read `.preferences` off the response JSON.
 *   Channel names are exactly `email`, `push`, `sms`, `inApp` (camelCase).
 * - Type slugs are free-form strings: keep ONE canonical slug per event (e.g.
 *   `order.shipped`) shared by the preferences UI and every dispatch call — a
 *   mismatched slug silently bypasses the user's choice (default-on).
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one by
 * one. A preference is only meaningful if it is HONORED at send time, so every
 * saved toggle must also be proven to change what actually gets delivered. A
 * box you can't check is an integration bug to fix — not a skip:
 * - [ ] A brand-new user with no saved row opens the preferences screen and it
 *   renders with SANE DEFAULTS: `GET /me/notification-preferences` returns an
 *   empty map (`{}`), never a 500 or crash, and every channel
 *   (email/push/sms/inApp) shows as ON — matching the default-on policy
 *   (`isEnabled()` is true before any row exists).
 * - [ ] Toggling a channel OFF for a category PERSISTS: disable one channel for
 *   one notification type (e.g. email for `order.shipped`) in the UI →
 *   `PUT /me/notification-preferences` saves it → a reload / re-read shows that
 *   channel `false` for that type while every other type and channel stays ON
 *   (the partial merge does not clobber the rest).
 * - [ ] The opt-out is ACTUALLY HONORED end-to-end: after disabling email for a
 *   category, trigger that notification through its real flow — the email is
 *   SUPPRESSED on the disabled channel while an enabled channel (e.g.
 *   in-app/push) still delivers. Verify against the captured outbound with the
 *   `read_activity` tool: the suppressed channel's message for that type is
 *   ABSENT and the enabled channel's message is present. A dispatch path that
 *   saves the toggle but never calls `isEnabled()` before sending is exactly
 *   the bug this catches.
 * - [ ] Transactional/critical notifications that must always send (security
 *   alerts, receipts, password resets) STILL deliver on their channel even
 *   after the user has disabled that category/channel — their dispatch path is
 *   intentionally NOT gated by `isEnabled()`. Confirm via `read_activity` that
 *   the critical message is still captured.
 * - [ ] AUTHORIZATION — a user reads and edits only THEIR OWN preferences. The
 *   routes are session-scoped (`/me/...`, the owner taken from the session); no
 *   request body, query, or path param lets a caller read or write another
 *   user's preferences (no id-guessing into someone else's row).
 */

export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
