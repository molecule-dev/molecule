/**
 * Booking/reservation resource for molecule.dev.
 *
 * Provides availability checking, booking creation, lifecycle management
 * (confirm, cancel, complete), rescheduling, and resource-scoped queries.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-booking'
 *
 * // Wired by mlcl inject (all routes require authenticate):
 * // GET    /bookings/availability/:resourceType/:resourceId?date=YYYY-MM-DD[&duration=60]
 * // POST   /bookings                       — create (starts 'pending', 409 on overlap)
 * // GET    /bookings                       — the caller's bookings
 * // GET    /bookings/:id
 * // POST   /bookings/:id/cancel | /confirm | /complete
 * // PUT    /bookings/:id/reschedule
 * ```
 *
 * @remarks
 * - **Migration required.** `src/__setup__/bookings.sql` ships with this package
 *   and must exist in the target database before use (scaffolded apps apply it
 *   automatically; existing apps must apply it first).
 * - **Bookable resources are polymorphic and NOT verified.** `resourceType` /
 *   `resourceId` are free-form — no FK, no existence or capacity check. Your app
 *   decides what is bookable and validates the target in domain code.
 * - **Every lifecycle action is owner-only.** cancel/reschedule/confirm/complete
 *   all reject when the booking's `userId` differs from the session user. There
 *   is no staff/operator role: if your app needs a provider to confirm bookings,
 *   add your own authorizer + handler — do not loosen the ownership checks.
 * - **The status machine is enforced** (`STATUS_TRANSITIONS`): pending →
 *   confirmed → completed/no-show, with cancel allowed from pending/confirmed.
 *   Creation always starts `pending`; `book` returns 409 when a non-cancelled
 *   booking overlaps the requested slot.
 * - Availability requires `?date=YYYY-MM-DD` (400 without it) and returns
 *   hourly slots based on existing bookings — it is a DISPLAY aid; `book`
 *   re-checks conflicts server-side at creation time.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is a booking bug to fix — not a skip:
 * - [ ] Booking an AVAILABLE slot succeeds (starts 'pending') and then appears
 *   in the user's own booking list (GET /bookings) at the exact start time you
 *   picked — not shifted, not missing.
 * - [ ] The status lifecycle advances in the UI: pending -> confirm ->
 *   confirmed, confirmed -> complete -> completed; cancel works from pending or
 *   confirmed and shows the booking as cancelled. A terminal booking (completed
 *   / cancelled / no-show) rejects any further confirm/complete/cancel/
 *   reschedule with a visible 409 error — the STATUS_TRANSITIONS machine is
 *   enforced, not just the happy path.
 * - [ ] DOUBLE-BOOKING is prevented — the core reservation invariant. Book a
 *   slot, then try to book the SAME resourceType + resourceId for an overlapping
 *   time: the second attempt is rejected ('not available', 409), never silently
 *   overlapped, and availability now shows that slot as taken. Cancelling the
 *   first booking frees the slot — a cancelled booking must no longer block it.
 * - [ ] Rescheduling a pending/confirmed booking moves it to the new time AND
 *   frees the old slot (the old time reads available again); rescheduling ONTO a
 *   time another active booking already holds is rejected (409), not overlapped.
 * - [ ] A past / no-show booking is handled sanely — a completed or no-show
 *   booking is terminal (cannot be re-confirmed or rescheduled), and any
 *   past/no-show UI the app adds acts only on the owner's own bookings.
 * - [ ] TIMEZONE is correct: a slot booked for a given local time shows back at
 *   that SAME local time in the list and detail — a booking made for 2pm local
 *   must not display as 9am or the next day (the stored instant must round-trip).
 * - [ ] AUTHORIZATION — a user sees and acts on ONLY their own bookings: the
 *   list is scoped to the session user; loading, cancelling, rescheduling,
 *   confirming, or completing another user's booking id returns 403 (no
 *   id-guessing into someone else's reservation); the caller cannot book on
 *   behalf of another user (the owner is the session, never the request body)
 *   or bypass the server-side availability re-check by posting an overlapping
 *   slot directly.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
