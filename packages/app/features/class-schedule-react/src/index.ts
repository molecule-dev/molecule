/**
 * Weekly class-schedule grid.
 *
 * Renders a 7-day × N-hour time grid with absolutely positioned event
 * tiles inside each day column. Overlapping events on the same weekday
 * are split into side-by-side lanes. Click handlers fire separately for
 * event tiles and empty time slots.
 *
 * Designed for school timetables, virtual classroom schedules, gym /
 * studio class calendars, conference tracks, and any other weekly
 * recurring time-of-day grid.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ClassSchedule, type ScheduleEvent, type ScheduleSlot } from '@molecule/app-class-schedule-react'
 *
 * export function TimetablePage() {
 *   const events: ScheduleEvent[] = [
 *     { id: 'math', weekday: 1, start: 9 * 60, end: 10 * 60 + 30, title: 'Math 101', subtitle: 'Room 4B', meta: 'Ms. Rivera' },
 *     { id: 'eng', weekday: 3, start: 11 * 60, end: 12 * 60, title: 'English', subtitle: 'Room 12', accentColor: '#2563eb' },
 *   ]
 *   const [selected, setSelected] = useState<ScheduleEvent | null>(null)
 *   const [slot, setSlot] = useState<ScheduleSlot | null>(null)
 *   return (
 *     <>
 *       <ClassSchedule
 *         events={events}
 *         dayHours={[8, 16]}
 *         showWeekendCols={false}
 *         locale="en-US"
 *         onEventClick={(event) => setSelected(event)}
 *         onSlotClick={(s) => setSlot(s)}
 *       />
 *       <p>{selected?.id ?? slot?.start}</p>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `start` / `end` are MINUTES from midnight (`9 * 60` = 09:00), NOT hours, Dates or
 *   `"09:00"` strings. `weekday` is `0` = Sunday … `6` = Saturday; default column order starts
 *   Monday (`weekStartsOn={1}`).
 * - It is a weekly RECURRING grid — there are no dates. Events outside `dayHours` (default
 *   `[8, 18]`) are clipped; events on hidden weekend columns are dropped.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise), and `getClassMap()` throws
 *   unless `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 * - Display only: it does not fetch, create or persist events — `onSlotClick` receives
 *   `{ weekday, start }` (start snapped to the hour row) for you to open your own editor.
 * - Pair with `@molecule/app-locales-class-schedule` for the aria-label translations.
 *
 * @module
 */

export * from './ClassSchedule.js'
