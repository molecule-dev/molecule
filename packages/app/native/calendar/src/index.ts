/**
 * Device calendar access interface for molecule.dev.
 *
 * Framework-agnostic core for reading and writing events in the DEVICE's
 * calendar store (the user's actual iOS/Android calendars) through a
 * swappable `CalendarProvider`: list calendars, query/create/update/delete
 * events, open the native calendar app, and manage permissions. Also ships
 * pure helpers (`eventsOverlap`, `getEventDuration`, `formatEventTimeRange`,
 * `parseQuickEvent`).
 *
 * NOT the same package as `@molecule/app-calendar` — that is the calendar
 * **UI** core (month/week/day views rendered inside your app). This package
 * talks to the operating system's calendar database. Pick by need: rendering
 * a calendar screen → `app-calendar`; syncing with the user's real calendars
 * → `app-device-calendar`.
 *
 * @example
 * ```typescript
 * import {
 *   createEvent,
 *   getCalendars,
 *   getEvents,
 *   getPermissionStatus,
 *   hasProvider,
 *   requestPermission,
 * } from '@molecule/app-device-calendar'
 *
 * async function addReminderToDeviceCalendar(): Promise<void> {
 *   if (!hasProvider()) return // no provider wired — feature-gate the UI
 *   if ((await getPermissionStatus()) !== 'granted') {
 *     if ((await requestPermission()) !== 'granted') return
 *   }
 *   const writable = (await getCalendars()).find((c) => !c.readOnly)
 *   if (!writable) return
 *   await createEvent({
 *     calendarId: writable.id,
 *     title: 'Dentist',
 *     startDate: '2026-08-01T09:00:00.000Z',
 *     endDate: '2026-08-01T09:30:00.000Z',
 *     allDay: false,
 *   })
 * }
 * ```
 *
 * @remarks
 * - **Every accessor THROWS until `setProvider()` is called** — there is no
 *   web fallback and **no prebuilt provider package ships with molecule**;
 *   supply a `CalendarProvider` from your native runtime and gate the UI on
 *   `hasProvider()`. Browsers cannot read/write the OS calendar store — on
 *   web, integrate a server-side calendar API (`@molecule/api-calendar`)
 *   instead.
 * - **Do not confuse this with `@molecule/app-calendar`** — they share nothing
 *   but a similar name. This package bonds its provider under the distinct
 *   `'device-calendar'` key (the calendar UI core uses `'calendar'`), so both
 *   can be wired in the same app without clobbering each other in the registry.
 * - Request permission from a user gesture at the point of use; a denied
 *   prompt is remembered — recovery is `openSettings()`. iOS can grant
 *   `'limited'` (write-only add) access.
 * - Respect `Calendar.readOnly` (subscribed/birthday calendars reject
 *   writes) and check `getCapabilities()` before offering attendees or
 *   recurrence editing — support differs per platform.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
