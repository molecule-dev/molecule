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
 * This provider honours FullCalendar's interaction rules on drag/resize.
 * `allowEventOverlap` (default `true`) mirrors FullCalendar's `eventOverlap`:
 * when `false`, a drag or resize that would collide with another event is
 * rejected (the event stays put, no `onEventDrop` / `onEventResize` fires).
 * `minEventDurationMinutes` (default `30`) clamps a resize so an event is
 * never shorter than the configured minimum — the start is kept and the end
 * pushed out. Both rules apply ONLY to the interactive `_handleEventDrop` /
 * `_handleEventResize` paths; programmatic `addEvent` / `setEvents` /
 * `updateEvent` are never blocked.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
