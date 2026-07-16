/**
 * FullCalendar-style provider for the molecule calendar interface.
 *
 * Implements `CalendarProvider` from `@molecule/app-calendar` as a HEADLESS
 * in-memory state manager modeled on FullCalendar's API shape — it does NOT
 * depend on or load the FullCalendar library, and it renders nothing. Your
 * app builds the grid from `getEvents()` / `getDate()` / `getView()` and
 * drives navigation/mutations through the instance.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-calendar-fullcalendar'
 * import { setProvider } from '@molecule/app-calendar'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * `FullCalendarConfig.allowEventOverlap` and `.minEventDurationMinutes` are
 * currently NOT enforced by this provider — they are stored and exposed via
 * `_getConfig()` for a rendering layer to honor. Overlap and duration rules
 * you need today belong in your `onEventDrop` / `onEventResize` handlers.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
