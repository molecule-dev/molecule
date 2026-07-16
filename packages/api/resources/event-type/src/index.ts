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
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
