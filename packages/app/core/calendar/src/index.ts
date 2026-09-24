/**
 * Calendar core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for calendar widgets with month,
 * week, day, and agenda views. Bond a provider
 * (e.g. `@molecule/app-calendar-fullcalendar`) at startup, then use
 * {@link createCalendar} anywhere.
 *
 * @example
 * ```typescript
 * import type { CalendarEvent } from '@molecule/app-calendar'
 * import { createCalendar, setProvider } from '@molecule/app-calendar'
 * import { provider } from '@molecule/app-calendar-fullcalendar'
 *
 * setProvider(provider) // at startup
 *
 * // Events come from YOUR API — the calendar keeps them in memory only.
 * const events: CalendarEvent[] = [
 *   {
 *     id: 'evt_1',
 *     title: 'Team standup',
 *     start: new Date('2026-03-02T09:00:00'),
 *     end: new Date('2026-03-02T09:15:00'),
 *   },
 * ]
 * const calendar = createCalendar({ events, view: 'month', date: new Date('2026-03-01T12:00:00') })
 *
 * // Headless: render your own grid from the state, and re-read it after every change.
 * calendar.addEvent({
 *   id: 'evt_2',
 *   title: 'Design review',
 *   start: new Date('2026-03-04T14:00:00'),
 *   end: new Date('2026-03-04T15:00:00'),
 * })
 * const titles = calendar.getEvents().map((e) => e.title) // ['Team standup', 'Design review']
 * calendar.next() // toolbar "next" button → April 2026
 * console.log(titles, calendar.getDate().getMonth(), calendar.getView()) // …, 3, 'month'
 * calendar.destroy() // on unmount
 * ```
 *
 * @remarks
 * - **HEADLESS — `createCalendar()` renders NOTHING.** The instance is a state
 *   manager: your app builds the visible grid from `getEvents()` / `getDate()` /
 *   `getView()` with its own markup (ClassMap-styled), and wires its own toolbar
 *   buttons to `prev()` / `next()` / `today()` / `setView()`. If no calendar
 *   appears on screen, this is why — there is no mount/element option to find.
 * - **No change-listener on the instance.** After calling any mutator
 *   (`setEvents`, `addEvent`, `updateEvent`, `removeEvent`, navigation), re-read
 *   state and re-render — or mirror the instance state into your framework's
 *   own state and drive rendering from that.
 * - Events live in memory only: load persisted events from your API into
 *   `options.events` / `setEvents()`, and persist creates/edits in your
 *   `onDateClick` / `onEventDrop` handlers — the calendar will not do it.
 * - Drag/resize callbacks fire only when `editable: true` (default `false`).
 * - **`onEventClick` / `onDateClick` / `onEventDrop` are NOT fired by the core
 *   instance methods** — in the FullCalendar bond they are invoked by the
 *   framework binding's DOM wiring. Calling `addEvent`/`updateEvent` yourself
 *   triggers no callback.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The calendar renders the seeded events on their correct dates/times.
 * - [ ] Every view the app exposes (month/week/day/agenda) shows the same
 *   events consistently when switching.
 * - [ ] Prev/next/today navigation lands on the right period with its events.
 * - [ ] Creating an event through the app's flow (slot click or button) shows
 *   it on the calendar and it persists across a full reload.
 * - [ ] Clicking an event opens its detail/edit, and an edit (time change, or
 *   drag-and-drop if supported) sticks after reload.
 * - [ ] Multi-day and overlapping events render legibly (no clipped or
 *   stacked-wrong entries).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
