/**
 * `@molecule/api-resource-event-type` — Calendly-style event-types +
 * weekly availability rules + slot generation.
 *
 * Extracted from the meeting-scheduler flagship.
 *
 * @example
 * ```ts
 * import { createEventTypeRouter } from '@molecule/api-resource-event-type'
 * app.use('/event-types', createEventTypeRouter())
 * ```
 *
 * @example
 * ```ts
 * import {
 *   createEventTypeForOwner,
 *   generateSlots,
 *   listAvailabilityRulesForUser,
 *   setAvailabilityRulesForUser,
 * } from '@molecule/api-resource-event-type'
 *
 * await setAvailabilityRulesForUser(userId, [
 *   { day_of_week: 1, start_minute: 540, end_minute: 1020, timezone: 'America/New_York' },
 * ])
 * await createEventTypeForOwner(userId, {
 *   name: '30-min consult',
 *   slug: '30-min',
 *   duration_minutes: 30,
 * })
 * const rules = await listAvailabilityRulesForUser(userId)
 * const slots = generateSlots({ date: '2026-06-15', durationMinutes: 30, rules })
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/event_types.sql` ships with this
 *   package (tables `event_types`, `availability_rules`) and must exist in the
 *   target database before use (scaffolded apps apply it automatically).
 * - **Mounting differs from sibling resources:** this package exports an Express
 *   `Router` FACTORY — `app.use('/event-types', createEventTypeRouter())` — not a
 *   declarative `routes` array + `requestHandlerMap`. It requires the Express
 *   default bonds (`requireUser`/`getParamId` from
 *   `@molecule/api-bonds-default-express`) to be wired.
 * - **The by-slug routes are PUBLIC by design** (`GET /by-slug/:slug` and
 *   `…/availability?date=YYYY-MM-DD` power the public booking page — no auth,
 *   no owner data beyond the published event type). Everything else is
 *   owner-scoped via the session; never accept an owner id from the client.
 * - **`generateSlots()` is timezone-naive and booking-blind.** It matches rules
 *   by the UTC day-of-week of `date` and returns minute-of-day slots straight
 *   from the rules — the stored `timezone` is NOT applied, and existing bookings
 *   are NOT subtracted. Convert for display in the app, and filter taken slots
 *   against your booking/meeting store before offering them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating an event type in the UI persists its real fields (name, slug,
 *   duration_minutes, location_kind, buffer_before/after) — reopen it and
 *   confirm each round-trips — and it appears in the owner's catalog list
 *   (GET /) with a shareable booking link at its slug (GET /by-slug/:slug
 *   resolves to the same event type).
 * - [ ] Availability + duration produce the right slot grid: set weekly rules
 *   to a 9am-5pm window (start_minute 540, end_minute 1020) and open the public
 *   availability for a matching weekday (GET /by-slug/:slug/availability?date=
 *   YYYY-MM-DD). A 30-min type yields back-to-back :00/:30 slots filling the
 *   window (16 of them) and no slot spills past end_minute.
 * - [ ] Buffers are respected: adding buffer_before/after widens the per-slot
 *   stride (duration + before + after), so the grid thins accordingly — a
 *   30-min type with a 15-min after-buffer no longer packs two slots per hour.
 * - [ ] Active/published gating works: an INACTIVE event type (is_active=false)
 *   404s from the public /by-slug/:slug AND its /availability; re-activating
 *   makes the booking link resolve again. (is_active IS the publish switch —
 *   there is no separate published flag.)
 * - [ ] Editing changes FUTURE slots: change duration_minutes (PUT /:id) or the
 *   availability window (PUT /availability/rules) and re-query availability —
 *   the returned grid reflects the new duration/window immediately.
 * - [ ] Timezone renders correctly, not shifted: rules carry a timezone but
 *   generateSlots returns minute-of-day slots in UTC without applying it —
 *   confirm the booking view converts each slot into the intended timezone (a
 *   9:00 local rule shows a 9:00 slot to the invitee, not a UTC-offset time),
 *   and changing the tz re-renders rather than silently re-timing the rule.
 * - [ ] Authorization — a signed-in owner manages ONLY their own event types:
 *   GET/PUT/DELETE /:id with another owner's id returns 404 (never the row,
 *   never an edit), and the client never supplies owner_id (it comes from the
 *   session). The public /by-slug view exposes only active types and returns
 *   only the event type + its generated slots — never the owner's raw
 *   availability rules or any inactive/private config beyond what booking needs.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
