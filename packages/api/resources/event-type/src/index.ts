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
 *   setAvailabilityRulesForUser,
 *   generateSlots,
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
 * const slots = generateSlots({ date: '2026-06-15', durationMinutes: 30, rules })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
