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
 * import { createCalendar, setProvider } from '@molecule/app-calendar'
 * import { createFullCalendarProvider } from '@molecule/app-calendar-fullcalendar'
 *
 * // Startup: bond once (no API key — nothing is fetched or rendered).
 * setProvider(createFullCalendarProvider({ defaultView: 'week', allowEventOverlap: false }))
 *
 * // Anywhere: create a calendar through the core and read state to render your grid.
 * const calendar = createCalendar({
 *   date: new Date(2026, 8, 21),
 *   editable: true,
 *   firstDay: 1, // Monday
 *   events: [
 *     { id: 'standup', title: 'Standup', start: new Date(2026, 8, 21, 9), end: new Date(2026, 8, 21, 9, 15) },
 *   ],
 *   onEventClick: (event) => console.log('Open', event.id),
 * })
 *
 * calendar.addEvent({
 *   id: 'review',
 *   title: 'Design review',
 *   start: new Date(2026, 8, 22, 14),
 *   end: new Date(2026, 8, 22, 15),
 * })
 * calendar.next() // one WEEK forward, because the view is 'week'
 * const visible = calendar.getEvents() // [standup, review] — render these yourself
 * calendar.destroy() // on unmount
 * ```
 *
 * @remarks
 * The factory is `createFullCalendarProvider(config)` — there is NO `createProvider` export.
 * Wire it with `setProvider(...)` from `@molecule/app-calendar` BEFORE the first core
 * `createCalendar(...)` call. It does not load or render the FullCalendar library
 * (no `@fullcalendar/*` install needed) — nothing appears on screen until your UI
 * draws `getEvents()`. `prev()`/`next()` step by the CURRENT view (month / 7 days / 1 day).
 *
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
