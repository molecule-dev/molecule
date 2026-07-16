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
 * import { setProvider, createCalendar } from '@molecule/app-calendar'
 * import { provider } from '@molecule/app-calendar-fullcalendar'
 *
 * setProvider(provider)
 *
 * const calendar = createCalendar({
 *   events: [
 *     {
 *       id: '1',
 *       title: 'Meeting',
 *       start: new Date('2026-03-28T10:00:00'),
 *       end: new Date('2026-03-28T11:00:00'),
 *     },
 *   ],
 *   view: 'month',
 *   onEventClick: (event) => console.log('Clicked:', event.title),
 * })
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
