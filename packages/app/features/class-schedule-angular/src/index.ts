/**
 * Angular weekly class-schedule grid — the counterpart of
 * `@molecule/app-class-schedule-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<div mol-class-schedule>` — a 7-day × N-hour time grid with
 * absolutely positioned event tiles inside each day column. Overlapping events
 * on the same weekday are split into side-by-side lanes, and the `eventClick` /
 * `slotClick` outputs fire separately for event tiles and empty time slots.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   ClassSchedule,
 *   type ScheduleEvent,
 *   type ScheduleSlot,
 * } from '@molecule/app-class-schedule-angular'
 *
 * @Component({
 *   selector: 'app-timetable',
 *   standalone: true,
 *   imports: [ClassSchedule],
 *   template: `
 *     <div
 *       mol-class-schedule
 *       [events]="events"
 *       (eventClick)="onEvent($event)"
 *       (slotClick)="onSlot($event)"
 *     ></div>
 *   `,
 * })
 * export class Timetable {
 *   readonly events: ScheduleEvent[] = [
 *     { id: 'c1', weekday: 1, start: 540, end: 630, title: 'Yoga' },
 *   ]
 *
 *   readonly onEvent = (event: ScheduleEvent): void => {
 *     console.log('open event', event.id)
 *   }
 *
 *   readonly onSlot = (slot: ScheduleSlot): void => {
 *     console.log('book slot', slot.weekday, slot.start)
 *   }
 * }
 * ```
 *
 * @remarks
 * Pair with `@molecule/app-locales-class-schedule` for translations
 * in 79 languages. All styling routes through `getClassMap()`; all
 * user-facing text routes through `t()`. Node-valued event lines (`title`,
 * `subtitle`, `meta`) take a `TemplateRef`.
 *
 * @module
 */

export * from './class-schedule.component.js'
export * from './helpers.js'
export * from './types.js'
