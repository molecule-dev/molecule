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
 * // POST   /bookings/:id/cancel | /reschedule | /confirm | /complete
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
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
