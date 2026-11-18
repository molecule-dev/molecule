/**
 * Vue weekly class-schedule grid.
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
 * This is the Vue counterpart of `@molecule/app-class-schedule-react`: the
 * same exports (React prop names), the same ClassMap tokens and the same DOM
 * for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ClassSchedule } from '@molecule/app-class-schedule-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ClassSchedule, {
 *         events: [
 *           { id: 'math', weekday: 1, start: 9 * 60, end: 10 * 60, title: 'Math 101', subtitle: 'Room 4B' },
 *           { id: 'eng', weekday: 3, start: 11 * 60, end: 12 * 60, title: 'English', subtitle: 'Room 12' },
 *         ],
 *         onEventClick: (e) => console.log('clicked', e.id),
 *         onSlotClick: (s) => console.log('empty slot', s),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-class-schedule` for translations
 * in 79 languages. All styling routes through `getClassMap()`; all
 * user-facing text routes through `t()`.
 *
 * @module
 */

export * from './ClassSchedule.js'
export * from './helpers.js'
export * from './types.js'
