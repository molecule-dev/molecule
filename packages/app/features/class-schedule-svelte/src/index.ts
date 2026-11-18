/**
 * Svelte weekly class-schedule grid.
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
 * This is the Svelte counterpart of `@molecule/app-class-schedule-react`: the
 * same exports (React prop names), the same ClassMap tokens and the same DOM
 * for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ClassSchedule } from '@molecule/app-class-schedule-svelte'
 *
 *   const events = [
 *     { id: 'math', weekday: 1, start: 9 * 60, end: 10 * 60, title: 'Math 101', subtitle: 'Room 4B' },
 *     { id: 'eng', weekday: 3, start: 11 * 60, end: 12 * 60, title: 'English', subtitle: 'Room 12' },
 *   ]
 * </script>
 *
 * <ClassSchedule
 *   {events}
 *   onEventClick={(e) => console.log('clicked', e.id)}
 *   onSlotClick={(s) => console.log('empty slot', s)}
 * />
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-class-schedule` for translations
 * in 79 languages. All styling routes through `getClassMap()`; all
 * user-facing text routes through `t()`. Node-valued lines (`title`,
 * `subtitle`, `meta`) take a snippet or plain text.
 *
 * @module
 */

export * from './components.js'
export * from './helpers.js'
export * from './types.js'
